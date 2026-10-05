#!/usr/bin/env python3
"""Validate combined RoomPacker annotations and their multi-session provenance."""
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

from build_quality_dataset import DESTINATION
from prepare_annotations import SESSIONS
from validate_annotations import ROOT, REPOSITORY, validate

CATEGORIES = {"single-session", "multi-session", "singlehop", "multihop", "preference", "temporal", "knowledge-facts", "open-domain"}
CITATION = re.compile(r'^(D\d+:\d+): "(.+)"$', re.DOTALL)


def check_sample(sample):
    errors = []
    if set(sample) != {"sample_id", "dataset", "num_sessions", "conversation", "qa"}:
        errors.append("Combined sample must use the five project fields.")
    if sample.get("num_sessions") != 6:
        errors.append("Expected six original sessions.")
    lookup = {}
    conversation = sample["conversation"]
    if set(conversation) != {f"session_{i}{suffix}" for i in range(1, 7) for suffix in ("", "_date_time")}:
        errors.append("Session fields differ from the combined schema.")
    for session in range(1, 7):
        for index, message in enumerate(conversation[f"session_{session}"], 1):
            if set(message) != {"role", "dia_id", "text"} or message["dia_id"] != f"D{session}:{index}":
                errors.append(f"Session {session}, message {index}: malformed message or dialogue ID.")
            lookup[message["dia_id"]] = message["text"]
    seen = set()
    for number, item in enumerate(sample["qa"], 1):
        label = f"Q{number:03d}"
        if set(item) != {"question", "answer", "category", "evidence"}:
            errors.append(f"{label}: wrong fields.")
        key = re.sub(r"\W+", "", item["question"].casefold())
        if key in seen:
            errors.append(f"{label}: duplicate question.")
        seen.add(key)
        if not item["question"].endswith("?") or not item["answer"].strip():
            errors.append(f"{label}: empty answer or incomplete question.")
        cats = item["category"]
        if not isinstance(cats, list) or len(cats) != len(set(cats)) or not set(cats) <= CATEGORIES:
            errors.append(f"{label}: invalid categories.")
            continue
        sessions = set()
        if not item["evidence"]:
            errors.append(f"{label}: no evidence.")
        for entry in item["evidence"]:
            match = CITATION.fullmatch(entry)
            if not match:
                errors.append(f"{label}: malformed evidence.")
                continue
            dia_id, quote = match.groups()
            if dia_id not in lookup or quote not in lookup[dia_id]:
                errors.append(f"{label}: quote not exact at {dia_id}.")
            sessions.add(dia_id.split(":")[0])
        if ("single-session" in cats) != (len(sessions) == 1) or ("multi-session" in cats) != (len(sessions) > 1):
            errors.append(f"{label}: session category disagrees with cited original sessions.")
        if sum(c in cats for c in ["singlehop", "multihop", "open-domain"]) != 1:
            errors.append(f"{label}: expected one reasoning category.")
    return errors


def main():
    sample = json.loads((DESTINATION / "vibe_combined.json").read_text())[0]
    report = validate()
    errors = list(report["errors"]) + check_sample(sample)
    mapping = json.loads((DESTINATION / "source-map.json").read_text())
    audit = json.loads((DESTINATION / "annotation-semantic-review.json").read_text())
    profile = json.loads((DESTINATION / "annotation-profile.json").read_text())
    if json.loads((DESTINATION / "output.json").read_text()) != {"qa": sample["qa"]}:
        errors.append("Standalone and combined annotations differ.")
    expected_mapping = []
    for session, (_, folder, _, _) in enumerate(SESSIONS, 1):
        cleaned = json.loads((REPOSITORY / "data" / folder / "cleaned-chat.json").read_text())
        rows = json.loads((REPOSITORY / "data" / folder / "source-map.json").read_text())["messages"]
        expected = [{"role": m["role"], "dia_id": f"D{session}:{n}", "text": m["content"][0]["text"]} for n, m in enumerate(cleaned, 1)]
        if sample["conversation"][f"session_{session}"] != expected:
            errors.append(f"Session {session}: combined transcript changed source prose.")
        record = mapping["sessions"][session - 1]
        raw = (REPOSITORY / record["raw_file"]).read_bytes()
        if hashlib.sha256(raw).hexdigest() != record["raw_sha256"]:
            errors.append(f"Session {session}: raw checksum mismatch.")
        for message, source in zip(expected, rows):
            expected_mapping.append({"dia_id": message["dia_id"], **source, "text_sha256": hashlib.sha256(message["text"].encode()).hexdigest()})
    if mapping["messages"] != expected_mapping:
        errors.append("Combined source map changed an original ID, timestamp or role.")
    if len(audit) != len(sample["qa"]):
        errors.append("Missing per-question reasoning audit.")
    else:
        for number, (item, review) in enumerate(zip(sample["qa"], audit), 1):
            digest = hashlib.sha256(json.dumps(item, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
            if review["question_id"] != f"Q{number:03d}" or digest != review["reviewed_sha256"] or not review["category_reason"]:
                errors.append(f"Q{number:03d}: semantic audit does not match the current item.")
    cats = dict(sorted(Counter(category for item in sample["qa"] for category in item["category"]).items()))
    citations = sum(len(item["evidence"]) for item in sample["qa"])
    if profile["categories"] != cats or profile["citations"] != citations or profile["curated_annotations"] != len(sample["qa"]):
        errors.append("Category profile or totals differ from current annotations.")
    result = {"status": "awaiting-human-review", "original_sessions": 6, "annotations": len(sample["qa"]), "citations": citations, "categories": cats, "errors": errors}
    (ROOT / "evidence/quality-validation.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    return bool(errors)


if __name__ == "__main__":
    raise SystemExit(main())
