from dataset_paths import DATA_ROOT
import hashlib
import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path
import sys
from conversation_sources import reconstruct, utc


ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else DATA_ROOT
MAIN = ROOT / "vibe_combined.json"
LABELS = {
    "single-session", "multi-session", "singlehop", "multihop",
    "preference", "temporal", "knowledge-facts", "open-domain",
}
EVIDENCE = re.compile(r'^(D[1-4]:\d+): "([\s\S]*)"$')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def original_text(message):
    require(len(message["content"]) == 1 and message["content"][0]["type"] == "text", "Unsupported raw content")
    value = message["content"][0]["text"]
    match = re.fullmatch(r'<user_input mode="[^"]+">([\s\S]*)</user_input>', value) if message["role"] == "user" else None
    return match.group(1) if match else value


projects = json.loads(MAIN.read_text())
require(isinstance(projects, list) and len(projects) == 1, "Expected one project in a top-level array")
project = projects[0]
require(set(project) == {"sample_id", "dataset", "num_sessions", "conversation", "qa"}, "Incorrect project fields")
require(project["sample_id"] == "vibe_focus_desk" and project["dataset"] == "vibe_focus_desk", "Incorrect project identity")
require(project["num_sessions"] == 4, "Expected four sessions")

conversation = project["conversation"]
require(set(conversation) == {key for number in range(1, 5) for key in (f"session_{number}_date_time", f"session_{number}")}, "Incorrect conversation fields")
message_text = {}
starts = []
for number in range(1, 5):
    label = f"D{number}"
    folder = ROOT / label
    source = json.loads((folder / "source-map.json").read_text())
    session, originals, expected_ledger = reconstruct(folder)
    for snapshot in (folder / "raw").glob("session-followup-*.json"):
        recorded = json.loads(snapshot.read_text())
        require(all(recorded[key] == session[key] for key in ("session_id", "started_at", "source", "provider", "model")), f"Session configuration changed: {label}/{snapshot.name}")
    cleaned = json.loads((folder / "cleaned-chat.json").read_text())
    included = conversation[f"session_{number}"]
    start = conversation[f"session_{number}_date_time"]
    starts.append(datetime.fromisoformat(start.replace("Z", "+00:00")))
    require(start == source["session_start_utc"] == utc(session["started_at"]), f"Start time mismatch in {label}")
    require(source["first_message_utc"] == originals[0]["timestamp_utc"], f"First-message time mismatch in {label}")
    require(source["original_session_id"] == session["session_id"], f"Session identity mismatch in {label}")
    require(included == cleaned, f"Combined text does not match cleaned {label}")
    require(len(included) == len(originals) == len(source["messages"]), f"Message count mismatch in {label}")
    ledger = json.loads((folder / "cleaning-ledger.json").read_text())
    require(ledger == expected_ledger, f"Cleaning ledger mismatch in {label}")
    require(set(source["source_files_sha256"]) == {p.name for p in (folder / "raw").iterdir() if p.is_file()}, f"Incomplete raw-file manifest in {label}")
    for filename, expected in source["source_files_sha256"].items():
        require(digest((folder / "raw" / filename).read_bytes()) == expected, f"Raw checksum mismatch: {label}/{filename}")
    ids = set()
    for index, (item, original, mapping) in enumerate(zip(included, originals, source["messages"]), 1):
        dia_id = f"{label}:{index}"
        require(set(item) == {"role", "dia_id", "text"}, f"Incorrect message fields: {dia_id}")
        require(item["dia_id"] == mapping["dia_id"] == dia_id, f"Message numbering mismatch: {dia_id}")
        require(item["role"] == original["role"] and item["text"] == original["text"], f"Original role/text mismatch: {dia_id}")
        for key, value in original.items():
            if key != "text": require(mapping[key] == value, f"Provenance mismatch: {dia_id}/{key}")
        require(mapping["original_message_id"] not in ids, f"Duplicate source message: {dia_id}")
        ids.add(mapping["original_message_id"])
        require(mapping["text_sha256"] == digest(item["text"].encode()), f"Text checksum mismatch: {dia_id}")
        message_text[dia_id] = item["text"]
    # Independently ensure that every public progress reply is represented exactly once.
    raw_progress_ids = []
    for path in (folder / "raw").glob("run-*.jsonl"):
        with path.open() as handle:
            for line in handle:
                record = json.loads(line)
                payload = record.get("payload", {})
                if record.get("type") == "response_item" and payload.get("type") == "message" and payload.get("role") == "assistant" and payload.get("phase") == "commentary":
                    raw_progress_ids.append(payload["id"])
    mapped_progress_ids = [item["original_message_id"] for item in source["messages"] if item["phase"] == "commentary"]
    require(Counter(raw_progress_ids) == Counter(mapped_progress_ids), f"Progress-reply coverage mismatch: {label}")
require(starts == sorted(starts) and len(set(starts)) == 4, "Session order is not chronological")

baseline = json.loads((ROOT / "revisions/before-repair/raw-checksums.json").read_text())
for path, expected in baseline.items():
    require(digest((ROOT / path).read_bytes()) == expected, f"Original archive changed: {path}")
require(len({json.loads((ROOT / f"D{i}/source-map.json").read_text())["original_session_id"] for i in range(1, 5)}) == 4, "Original sessions are not distinct")

qa = project["qa"]
require(isinstance(qa, list) and len(qa) >= 50, "Fewer than 50 questions")
require(qa == json.loads((ROOT / "annotations.json").read_text()), "Standalone annotations differ from combined file")
require(len(set(item["question"].casefold().strip() for item in qa)) == len(qa), "Duplicate question text")
for number, item in enumerate(qa, 1):
    require(set(item) == {"question", "category", "evidence", "answer"}, f"Incorrect QA fields: Q{number:03d}")
    require(all(isinstance(item[field], str) and item[field].strip() for field in ("question", "answer")), f"Empty question/answer: Q{number:03d}")
    labels = item["category"]
    require(isinstance(labels, list) and labels and len(labels) == len(set(labels)) and set(labels) <= LABELS, f"Bad labels: Q{number:03d}")
    require(isinstance(item["evidence"], list) and item["evidence"], f"Missing evidence: Q{number:03d}")
    cited_sessions = set()
    for citation in item["evidence"]:
        match = EVIDENCE.fullmatch(citation)
        require(match is not None, f"Bad evidence format: Q{number:03d}")
        dia_id, excerpt = match.groups()
        require(dia_id in message_text and excerpt in message_text[dia_id], f"Nonverbatim evidence: Q{number:03d}/{dia_id}")
        cited_sessions.add(dia_id.split(":")[0])
    require(("multi-session" in labels) == (len(cited_sessions) > 1), f"Session category mismatch: Q{number:03d}")
    require(("single-session" in labels) == (len(cited_sessions) == 1), f"Single-session category mismatch: Q{number:03d}")
    require(not ({"singlehop", "multihop"} <= set(labels)), f"Conflicting hop categories: Q{number:03d}")
    require("multi-session" not in labels or "multihop" in labels, f"Multi-session item lacks multihop: Q{number:03d}")
    require("open-domain" not in labels or not ({"singlehop", "multihop"} & set(labels)), f"Open-domain hop label: Q{number:03d}")

dependencies = json.loads((ROOT / "question-dependencies.json").read_text())
require(len(dependencies) == len(qa), "Dependency record count mismatch")
for number, (item, dependency) in enumerate(zip(qa, dependencies), 1):
    question_id = f"Q{number:03d}"
    require(dependency["question_id"] == question_id, f"Dependency ID mismatch: {question_id}")
    evidence_ids = list(dict.fromkeys(EVIDENCE.fullmatch(value).group(1) for value in item["evidence"]))
    require(dependency["evidence_dia_ids"] == evidence_ids, f"Dependency evidence mismatch: {question_id}")
    for parent in dependency["requires_answers"]:
        require(re.fullmatch(r"Q\d{3}", parent) and int(parent[1:]) < number, f"Invalid dependency: {question_id} -> {parent}")

counts = Counter(label for item in qa for label in item["category"])
distribution = json.loads((ROOT / "category-distribution.json").read_text())
require(distribution["question_count"] == len(qa) and distribution["counts"] == dict(sorted(counts.items())), "Distribution mismatch")
semantic_review = json.loads((ROOT / "annotation-semantic-review.json").read_text())
require(len(semantic_review) == len(qa), "Semantic review coverage mismatch")
for number, (item, review) in enumerate(zip(qa, semantic_review), 1):
    require(review["question_id"] == f"Q{number:03d}", "Semantic review numbering mismatch")
    require(review["reviewed_sha256"] == digest(json.dumps(item, sort_keys=True, ensure_ascii=False).encode()), f"Semantic review is stale: Q{number:03d}")
    require(review["category_reason"].strip(), "Semantic review rationale missing")
renumbering = json.loads((ROOT / "message-renumbering.json").read_text())
for label in ("D1", "D2", "D3", "D4"):
    original = json.loads((ROOT / "revisions/before-repair" / label / "source-map.json").read_text())
    current = json.loads((ROOT / label / "source-map.json").read_text())
    by_id = {item["original_message_id"]: item["dia_id"] for item in current["messages"]}
    for item in original["messages"]:
        require(renumbering[item["dia_id"]] == by_id[item["original_message_id"]], "Incorrect legacy citation mapping")
print(f"Validated {len(conversation) // 2} sessions, {len(message_text)} messages, {len(qa)} questions, all raw checksums, and all evidence excerpts.")
print(dict(sorted(counts.items())))
