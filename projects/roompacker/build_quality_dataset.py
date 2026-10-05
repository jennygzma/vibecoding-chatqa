#!/usr/bin/env python3
"""Reproduce the archived 72-question draft; the canonical builder is scripts/michael_dataset.py."""
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from generate_draft_annotations import DRAFTS
from quality_annotations import CROSS, SELECTION, curated
from prepare_annotations import SESSIONS

ROOT = Path(__file__).resolve().parent
REPOSITORY = ROOT.parent.parent
DESTINATION = REPOSITORY / "data/roompacker/revisions/72-question-draft"


def iso(timestamp):
    return datetime.fromtimestamp(timestamp / 1000, timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def main():
    selected, _ = curated(DRAFTS)
    conversation, lookup, source_messages, session_index = {}, {}, [], []
    qa, audit, review_groups = [], [], []
    for session_number, (session, folder, title, _) in enumerate(SESSIONS, 1):
        raw_path = ROOT / "evidence/raw" / f"{session}.messages.json"
        raw_bytes = raw_path.read_bytes()
        document = json.loads(raw_bytes)
        directory = REPOSITORY / "data" / folder
        cleaned = json.loads((directory / "cleaned-chat.json").read_text())
        mapping = json.loads((directory / "source-map.json").read_text())["messages"]
        messages = []
        for index, (message, source) in enumerate(zip(cleaned, mapping), 1):
            dia_id = f"D{session_number}:{index}"
            text = message["content"][0]["text"]
            messages.append({"role": message["role"], "dia_id": dia_id, "text": text})
            lookup[dia_id] = text
            source_messages.append({"dia_id": dia_id, **source, "text_sha256": hashlib.sha256(text.encode()).hexdigest()})
        started = iso(document["messages"][0]["ts"])
        conversation[f"session_{session_number}_date_time"] = started
        conversation[f"session_{session_number}"] = messages
        session_index.append({
            "number": session_number, "conversation": f"D{session_number}",
            "original_session_id": session, "title": title,
            "first_message_at": started,
            "start_basis": "First recorded raw-message timestamp; independent session-start metadata is not available in this archive.",
            "raw_file": raw_path.relative_to(REPOSITORY).as_posix(),
            "raw_sha256": hashlib.sha256(raw_bytes).hexdigest(),
            "cleaned_file": (directory / "cleaned-chat.json").relative_to(REPOSITORY).as_posix(),
            "visible_messages": len(messages),
            "researcher_prompts": sum(message["role"] == "user" for message in messages),
        })
        group = {"id": folder, "title": f"{session_number} · {title}", "promptCount": session_index[-1]["researcher_prompts"], "messageCount": len(messages), "items": []}
        local = json.loads((directory / "output.json").read_text())["qa"]
        for item, original in zip(local, selected[folder]):
            record = {key: item[key] for key in ("question", "answer")}
            record["category"] = original["labels"]
            record["evidence"] = [entry.replace("D1:", f"D{session_number}:", 1) for entry in item["evidence"]]
            qa.append(record)
            question_id = f"Q{len(qa):03d}"
            audit.append({"question_id": question_id, "question": record["question"], "reviewed_sha256": hashlib.sha256(json.dumps(record, sort_keys=True, ensure_ascii=False).encode()).hexdigest(), "editorial_status": "source-and-reasoning-checked", "researcher_approval": "pending", "category_reason": original["category_reason"], "initial_draft_item": f"{folder}:{original['original_number']}"})
            group["items"].append({"question_id": question_id, "review_category": item["category"], **record})
        review_groups.append(group)
    cross_group = {"id": "roompacker_cross-session", "title": "Across threads · Reasoning", "promptCount": 0, "messageCount": len(lookup), "items": []}
    for item in CROSS:
        evidence = []
        for session, index, quote in item["evidence_sources"]:
            dia_id = f"D{session}:{index}"
            if quote not in lookup[dia_id]:
                raise ValueError(f"Cross-session quote absent at {dia_id}: {quote!r}")
            evidence.append(f'{dia_id}: "{quote}"')
        record = {"question": item["question"], "answer": item["answer"], "category": item["category"], "evidence": evidence}
        qa.append(record)
        question_id = f"Q{len(qa):03d}"
        audit.append({"question_id": question_id, "question": record["question"], "reviewed_sha256": hashlib.sha256(json.dumps(record, sort_keys=True, ensure_ascii=False).encode()).hexdigest(), "editorial_status": "source-and-reasoning-checked", "researcher_approval": "pending", "category_reason": item["reason"]})
        cross_group["items"].append({"question_id": question_id, "review_category": 3 if "open-domain" in item["category"] else 1, **record})
    review_groups.append(cross_group)
    sample = {"sample_id": "vibe_roompacker", "dataset": "vibe_roompacker", "num_sessions": 6, "conversation": conversation, "qa": qa}
    write(DESTINATION / "vibe_combined.json", [sample])
    write(DESTINATION / "output.json", {"qa": qa})
    write(DESTINATION / "source-map.json", {"sessions": session_index, "messages": source_messages})
    write(DESTINATION / "session-index.json", session_index)
    write(DESTINATION / "annotation-semantic-review.json", audit)
    write(ROOT / "evidence/curated-review-groups.json", review_groups)
    profile = {
        "status": "awaiting-human-review", "initial_annotations": 109,
        "curated_annotations": len(qa), "local_questions": 60, "cross_session_questions": len(CROSS),
        "citations": sum(len(item["evidence"]) for item in qa),
        "categories": dict(sorted(Counter(label for item in qa for label in item["category"]).items())),
        "comparison_sources": ["data/cedar_table/output.json", "data/cedar_table/annotation-profile.json", "data/focus_desk/annotations.json", "data/focus_desk/annotation-semantic-review.json"],
        "quality_changes": [
            "Removed or consolidated repetitive control, color, pixel-size and function-name lookups.",
            "Added cross-session questions that require facts from separate original conversations.",
            "Reclassified ordinary implementation revisions as multihop rather than temporal.",
            "Used temporal only for explicit durations, cadence or event timing.",
            "Added preference only when an actual user request is cited.",
            "Used open-domain for concise, source-grounded interpretation; no invented user preferences.",
            "Distinguished the requested three-cell L from the reported five-cell default.",
            "Distinguished offset clamping from proof of cube containment.",
            "Preserved historical behavior and original transcript text without claiming that earlier features survived the 3D rewrite.",
            "Preserved the initial 109-item draft under evidence/revisions/initial-109 for traceability."
        ],
        "distribution_policy": "Categories describe supported reasoning; Edgar's observed proportions are not quotas.",
        "researcher_approval": "pending",
    }
    write(DESTINATION / "annotation-profile.json", profile)
    write(ROOT / "evidence/quality-review.json", profile)
    dropped = []
    for session, (folder, drafts) in enumerate(DRAFTS.items(), 1):
        kept = {number for number, _, _ in SELECTION[session]}
        for number, item in enumerate(drafts, 1):
            if number not in kept:
                dropped.append({"initial_item": f"{folder}:{number}", "question": item["question"], "decision": "removed-from-curated-set", "reason": "Covered by a retained broader question, repeated a rule already tested elsewhere, or primarily queried low-value presentation/implementation detail."})
    write(ROOT / "evidence/editorial-removals.json", dropped)
    print(json.dumps(profile, indent=2))


if __name__ == "__main__":
    main()
