#!/usr/bin/env python3
"""Check annotation structure, exact evidence, and original message provenance."""
from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EVIDENCE = re.compile(r'^D1:(\d+): "(.+)"$', re.S)


def source_prose(message):
    role = message.get("role")
    if role not in {"user", "assistant"}:
        return []
    result = []
    for block in message.get("content", []):
        if not isinstance(block, dict) or block.get("type") != "text":
            continue
        text = block.get("text")
        if not isinstance(text, str):
            continue
        if role == "user":
            match = re.fullmatch(r'\s*<user_input\s+mode="[^"]+">(.*)</user_input>\s*', text, re.S)
            if not match:
                continue
            text = match.group(1)
        if text.strip():
            result.append(text.strip())
    return result


def reconstruct(raw_documents):
    merged, records = [], []
    for doc in raw_documents:
        session = doc["sessionId"]
        for position, message in enumerate(doc["messages"]):
            merged.append({"session": session, "original_position": position, "message": message})
            for text in source_prose(message):
                clean = {"role": message["role"], "content": [{"type": "text", "text": text}]}
                mapping = {
                    "session": session,
                    "original_message_id": message["id"],
                    "timestamp": message["ts"],
                    "role": message["role"],
                    "original_position": position,
                }
                records.append((clean, mapping))
    records.sort(key=lambda pair: pair[1]["timestamp"])
    for index, (_, mapping) in enumerate(records, 1):
        mapping["index"] = index
    return merged, [pair[0] for pair in records], [pair[1] for pair in records]


def data_directory(root=ROOT):
    local = root / "data/mahjong"
    return local if local.is_dir() else root.parent.parent / "data/mahjong"


def validate(root=ROOT):
    data, raw = data_directory(root), root / "evidence/raw"
    errors = []
    try:
        cleaned = json.loads((data / "cleaned-chat.json").read_text())
        mapping = json.loads((data / "source-map.json").read_text())
        history = json.loads((data / "chat-history.json").read_text())
        output = json.loads((data / "output.json").read_text())
        manifest = history["raw_files"]
        if len(manifest) != 4 or len({row["session"] for row in manifest}) != 4:
            errors.append("Expected four distinct archived development sessions.")
        documents = []
        for row in manifest:
            filename = row["filename"]
            if Path(filename).name != filename:
                raise ValueError("Archive filenames must be local basenames.")
            original = (raw / filename).read_bytes()
            if hashlib.sha256(original).hexdigest() != row["sha256"]:
                errors.append(f"Raw archive hash mismatch: {filename}")
            if len(original) != row["bytes"]:
                errors.append(f"Raw archive size mismatch: {filename}")
            doc = json.loads(original)
            if doc["sessionId"] != row["session"]:
                errors.append(f"Raw archive session mismatch: {filename}")
            documents.append(doc)
        merged, expected_cleaned, expected_map = reconstruct(documents)
        if history["messages"] != merged:
            errors.append("Merged history differs from the original messages.")
        if cleaned != expected_cleaned:
            errors.append("Cleaned text or roles differ from the original prose.")
        if mapping["messages"] != expected_map:
            errors.append("Source map differs from original IDs, roles, timestamps, or positions.")
        qa = output["qa"]
        if set(output) != {"qa"} or not isinstance(qa, list) or len(qa) < 100:
            errors.append("The output must contain a qa array with at least 100 items.")
        seen, category_counts, coverage = set(), Counter(), Counter()
        citations = 0
        for number, item in enumerate(qa, 1):
            label = f"Item {number}"
            if not isinstance(item, dict) or set(item) != {"question", "answer", "evidence", "category"}:
                errors.append(f"{label}: invalid fields.")
                continue
            question, answer = item["question"], item["answer"]
            if not isinstance(question, str) or not question.strip().endswith("?"):
                errors.append(f"{label}: expected a complete question.")
                continue
            if question.startswith("What did the Willow Table development conversation state about"):
                errors.append(f"{label}: clipped-sentence template is not a reviewed question.")
            key = re.sub(r"\W+", "", question.casefold())
            if key in seen:
                errors.append(f"{label}: duplicate question.")
            seen.add(key)
            if not isinstance(answer, str) or not answer.strip():
                errors.append(f"{label}: empty answer.")
            category = item["category"]
            if type(category) is not int or category not in {1, 2, 3, 4, 5}:
                errors.append(f"{label}: invalid category.")
            else:
                category_counts[category] += 1
            evidence = item["evidence"]
            if not isinstance(evidence, list) or not evidence:
                errors.append(f"{label}: evidence must be a nonempty array.")
                continue
            indices, sessions = set(), set()
            for entry in evidence:
                match = EVIDENCE.fullmatch(entry) if isinstance(entry, str) else None
                if not match:
                    errors.append(f"{label}: malformed evidence citation.")
                    continue
                index, quote = int(match[1]), match[2]
                if not 1 <= index <= len(expected_cleaned):
                    errors.append(f"{label}: citation index outside the corpus.")
                    continue
                original_text = expected_cleaned[index - 1]["content"][0]["text"]
                if quote not in original_text:
                    errors.append(f"{label}: quote is not exact in D1:{index}.")
                citations += 1
                indices.add(index)
                sessions.add(expected_map[index - 1]["session"])
            if category in {1, 2} and len(indices) < 2:
                errors.append(f"{label}: this package's multi-hop and temporal items need distinct source messages.")
            coverage.update(sessions)
        if set(coverage) != {doc["sessionId"] for doc in documents}:
            errors.append("Annotations must cover all four development sessions.")
        report = {
            "annotations": len(qa),
            "citations": citations,
            "cleaned_messages": len(expected_cleaned),
            "roles": dict(Counter(message["role"] for message in expected_cleaned)),
            "categories": dict(sorted(category_counts.items())),
            "session_coverage": dict(coverage),
            "raw_archives": len(documents),
            "errors": errors,
        }
    except (OSError, ValueError, KeyError, TypeError, IndexError) as exc:
        return {"errors": [f"Package cannot be validated: {exc}"]}
    return report


def main():
    report = validate()
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
