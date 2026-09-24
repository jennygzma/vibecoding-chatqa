#!/usr/bin/env python3
"""Validate StartupSimulator draft structure, evidence, and raw provenance."""
from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPOSITORY = ROOT.parent.parent
sys.path.insert(0, str(REPOSITORY))

from app.cline_export import reconstruct  # noqa: E402
from build_annotations import TRAJECTORIES  # noqa: E402

EVIDENCE = re.compile(r'^D1:(\d+): "(.+)"$', re.DOTALL)


def roots(root: Path = ROOT) -> tuple[Path, Path]:
    local_data = root / "data"
    data = local_data if all((local_data / name).is_dir() for name in TRAJECTORIES) else root.parent.parent / "data"
    return data, root / "evidence/raw"


def validate(root: Path = ROOT) -> dict:
    data_root, raw_root = roots(root)
    all_errors = []
    reports = {}
    global_questions = set()

    for folder, expected_filename in TRAJECTORIES.items():
        errors = []
        citations = 0
        categories = Counter()
        try:
            data = data_root / folder
            cleaned = json.loads((data / "cleaned-chat.json").read_text())
            mapping = json.loads((data / "source-map.json").read_text())
            history = json.loads((data / "chat-history.json").read_text())
            output = json.loads((data / "output.json").read_text())

            manifest = history["raw_files"]
            if len(manifest) != 1 or manifest[0]["filename"] != expected_filename:
                errors.append("Unexpected raw-session manifest.")
            row = manifest[0]
            original = (raw_root / expected_filename).read_bytes()
            if hashlib.sha256(original).hexdigest() != row["sha256"]:
                errors.append("Raw archive hash mismatch.")
            if len(original) != row["bytes"]:
                errors.append("Raw archive size mismatch.")
            document = json.loads(original)
            if document["sessionId"] != row["session"]:
                errors.append("Raw archive session mismatch.")

            merged, expected_cleaned, expected_map = reconstruct([document])
            if history.get("format") != "cline-merged-history-v1":
                errors.append("Unexpected merged-history format.")
            if history["messages"] != merged:
                errors.append("Merged history differs from the raw session.")
            if cleaned != expected_cleaned:
                errors.append("Cleaned transcript differs from the raw session.")
            if mapping.get("format") != "cline-source-map-v1":
                errors.append("Unexpected source-map format.")
            if mapping["messages"] != expected_map:
                errors.append("Source map differs from raw message provenance.")

            qa = output["qa"]
            if set(output) != {"qa"} or not isinstance(qa, list) or not 5 <= len(qa) <= 30:
                errors.append("output.json must contain 5–30 QA items.")
                qa = []
            local_questions = set()
            for number, item in enumerate(qa, 1):
                label = f"Item {number}"
                if not isinstance(item, dict) or set(item) != {"question", "answer", "evidence", "category"}:
                    errors.append(f"{label}: invalid fields.")
                    continue
                question = item["question"]
                answer = item["answer"]
                if not isinstance(question, str) or not question.strip().endswith("?"):
                    errors.append(f"{label}: expected a complete question.")
                    continue
                key = re.sub(r"\W+", "", question.casefold())
                if key in local_questions:
                    errors.append(f"{label}: duplicate question in trajectory.")
                if key in global_questions:
                    errors.append(f"{label}: duplicate question across trajectories.")
                local_questions.add(key)
                global_questions.add(key)
                if not isinstance(answer, str) or not answer.strip():
                    errors.append(f"{label}: empty answer.")

                category = item["category"]
                if type(category) is not int or category not in {1, 2, 3, 4, 5}:
                    errors.append(f"{label}: invalid category.")
                else:
                    categories[category] += 1

                evidence = item["evidence"]
                if not isinstance(evidence, list) or not evidence:
                    errors.append(f"{label}: evidence must be a nonempty array.")
                    continue
                indices = set()
                for entry in evidence:
                    match = EVIDENCE.fullmatch(entry) if isinstance(entry, str) else None
                    if not match:
                        errors.append(f"{label}: malformed evidence citation.")
                        continue
                    index, quote = int(match.group(1)), match.group(2)
                    if not 1 <= index <= len(expected_cleaned):
                        errors.append(f"{label}: citation index outside the transcript.")
                        continue
                    source = expected_cleaned[index - 1]["content"][0]["text"]
                    if quote not in source:
                        errors.append(f"{label}: quote is not exact in D1:{index}.")
                    citations += 1
                    indices.add(index)
                if category in {1, 2} and len(indices) < 2:
                    errors.append(f"{label}: multi-hop/temporal item needs distinct messages.")

            reports[folder] = {
                "annotations": len(qa),
                "citations": citations,
                "cleaned_messages": len(expected_cleaned),
                "roles": dict(Counter(message["role"] for message in expected_cleaned)),
                "categories": dict(sorted(categories.items())),
                "errors": errors,
            }
        except (OSError, ValueError, KeyError, TypeError, IndexError) as exc:
            reports[folder] = {"errors": [f"Package cannot be validated: {exc}"]}
            errors = reports[folder]["errors"]
        all_errors.extend(f"{folder}: {error}" for error in errors)

    return {
        "status": "reviewed-and-validated",
        "trajectories": reports,
        "totals": {
            "trajectories": len(reports),
            "annotations": sum(report.get("annotations", 0) for report in reports.values()),
            "citations": sum(report.get("citations", 0) for report in reports.values()),
        },
        "errors": all_errors,
    }


def main() -> int:
    report = validate()
    print(json.dumps(report, indent=2, ensure_ascii=False))
    evidence = ROOT / "evidence"
    evidence.mkdir(parents=True, exist_ok=True)
    (evidence / "annotation-validation.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
