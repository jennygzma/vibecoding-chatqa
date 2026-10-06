#!/usr/bin/env python3
"""Build one provenance-preserving annotation index from current data packages."""
from __future__ import annotations

import hashlib
import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from michael_approval import APPROVED, PENDING, validate_saved_review

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUTPUT = DATA / "master_annotations.json"

NUMERIC_CATEGORIES = {
    1: "multi-hop",
    2: "temporal",
    3: "open-domain",
    4: "single-hop",
    5: "adversarial",
}
TEXT_CATEGORIES = {
    "singlehop": "single-hop",
    "multihop": "multi-hop",
}
PROJECTS = {
    "cedar_table": ("cedar-table", "Cedar Table", "reviewed-pending-approval"),
    "focus_desk": ("focus-desk", "Focus Desk", "reviewed-pending-approval"),
    "pantry_lane": ("pantry-lane", "Pantry Lane", "reviewed-pending-approval"),
    "roompacker": ("roompacker", "Roompacker", PENDING),
    "mahjong": ("mahjong", "Mahjong", "reviewed-pending-approval"),
    "notesense": ("notesense", "NoteSense", "status-not-recorded"),
    "snakegame": ("snakegame", "Snake Game", "status-not-recorded"),
    "startupsimulator": ("startupsimulator", "StartupSimulator", PENDING),
    "stockapp": ("stockapp", "StockApp", PENDING),
}
CURATED = {"stockapp", "startupsimulator", "roompacker"}
COMBINED = CURATED | {"cedar_table", "focus_desk", "pantry_lane", "mahjong"}
ALLOWED_CATEGORIES = set(NUMERIC_CATEGORIES.values()) | {
    "single-session", "multi-session", "preference", "knowledge-facts",
}


def project_info(folder: str) -> tuple[str, str, str]:
    for prefix, info in PROJECTS.items():
        if folder == prefix or folder.startswith(f"{prefix}_"):
            return info
    raise ValueError(f"No project mapping for annotation folder: {folder}")


def normalize_categories(value: object) -> list[str]:
    if type(value) is int:
        if value not in NUMERIC_CATEGORIES:
            raise ValueError(f"Unknown numeric category: {value}")
        return [NUMERIC_CATEGORIES[value]]
    if isinstance(value, list) and value and all(isinstance(item, str) and item for item in value):
        normalized = [TEXT_CATEGORIES.get(item, item) for item in value]
        if len(set(normalized)) != len(normalized) or not set(normalized) <= ALLOWED_CATEGORIES:
            raise ValueError(f"Unknown or repeated categories: {value!r}")
        return normalized
    raise ValueError(f"Unsupported category value: {value!r}")


def annotation_sources() -> list[Path]:
    # The per-trajectory outputs and Roompacker's 72-question predecessor are
    # preserved history. Do not count them alongside their curated replacements.
    sources = [path for path in sorted(DATA.glob("*/output.json"))
               if not any(path.parent.name == project or path.parent.name.startswith(project + "_")
                          for project in CURATED)]
    for folder in sorted(CURATED | {"focus_desk", "pantry_lane"}):
        path = DATA / folder / "annotations.json"
        if not path.is_file():
            raise ValueError(f"Missing canonical annotation set: {path.relative_to(ROOT)}")
        sources.append(path)
    return sorted(sources)


def load_annotations(path: Path) -> list[dict]:
    document = json.loads(path.read_text(encoding="utf-8"))
    rows = document.get("qa") if isinstance(document, dict) else document
    if not isinstance(rows, list) or not rows:
        raise ValueError(f"Annotation source is empty or malformed: {path}")
    return rows


def build() -> dict:
    approval = validate_saved_review(ROOT)
    annotations = []
    sources = []
    project_counts: dict[str, Counter] = defaultdict(Counter)
    category_counts: Counter = Counter()
    ids = set()

    for path in annotation_sources():
        relative = path.relative_to(ROOT).as_posix()
        folder = path.parent.name
        project, project_name, review_status = project_info(folder)
        if folder in CURATED and approval:
            review_status = APPROVED
        rows = load_annotations(path)
        source_id = folder
        trajectory = "combined" if folder in COMBINED else folder
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        citations = 0

        for index, row in enumerate(rows, 1):
            if not isinstance(row, dict):
                raise ValueError(f"{relative} item {index} is not an object")
            question = row.get("question")
            answer = row.get("answer")
            evidence = row.get("evidence")
            if not isinstance(question, str) or not question.strip():
                raise ValueError(f"{relative} item {index} has no question")
            if not isinstance(answer, str) or not answer.strip():
                raise ValueError(f"{relative} item {index} has no answer")
            if not isinstance(evidence, list) or not evidence or not all(isinstance(item, str) and item for item in evidence):
                raise ValueError(f"{relative} item {index} has invalid evidence")
            categories = normalize_categories(row.get("category"))
            annotation_id = f"{source_id}:{index:03d}"
            if annotation_id in ids:
                raise ValueError(f"Duplicate annotation id: {annotation_id}")
            ids.add(annotation_id)
            citations += len(evidence)
            category_counts.update(categories)
            annotations.append(
                {
                    "id": annotation_id,
                    "project": project,
                    "trajectory": trajectory,
                    "source_file": relative,
                    "source_index": index,
                    "question": question,
                    "answer": answer,
                    "evidence": evidence,
                    "categories": categories,
                    "source_category": row["category"],
                }
            )

        sources.append(
            {
                "id": source_id,
                "project": project,
                "project_name": project_name,
                "trajectory": trajectory,
                "review_status": review_status,
                "path": relative,
                "sha256": digest,
                "annotations": len(rows),
                "citations": citations,
            }
        )
        semantic_review = path.parent / "annotation-semantic-review.json"
        if folder in CURATED and approval:
            sources[-1]["human_review_path"] = approval["path"]
            sources[-1]["human_review_sha256"] = approval["sha256"]
            sources[-1]["human_review_exported_at"] = approval["exported_at"]
        if semantic_review.is_file():
            sources[-1]["semantic_review_path"] = semantic_review.relative_to(ROOT).as_posix()
            sources[-1]["semantic_review_sha256"] = hashlib.sha256(semantic_review.read_bytes()).hexdigest()
        combined = path.parent / "vibe_combined.json"
        if combined.is_file():
            sample = json.loads(combined.read_text())[0]
            if sample["qa"] != rows:
                raise ValueError(f"Combined/standalone questions disagree: {relative}")
            sources[-1]["combined_path"] = combined.relative_to(ROOT).as_posix()
            sources[-1]["combined_sha256"] = hashlib.sha256(combined.read_bytes()).hexdigest()
        project_counts[project]["sources"] += 1
        project_counts[project]["annotations"] += len(rows)
        project_counts[project]["citations"] += citations

    projects = []
    for project in sorted(project_counts):
        name = next(source["project_name"] for source in sources if source["project"] == project)
        status = next(source["review_status"] for source in sources if source["project"] == project)
        projects.append(
            {
                "id": project,
                "name": name,
                "review_status": status,
                **dict(project_counts[project]),
            }
        )

    return {
        "format": "vibecoding-chatqa-master-annotations-v1",
        "summary": {
            "projects": len(projects),
            "sources": len(sources),
            "annotations": len(annotations),
            "citations": sum(len(item["evidence"]) for item in annotations),
            "category_assignments": dict(sorted(category_counts.items())),
        },
        "category_normalization": {
            "numeric": {str(key): value for key, value in NUMERIC_CATEGORIES.items()},
            "text_aliases": TEXT_CATEGORIES,
            "note": "source_category preserves each source value; categories provides normalized labels.",
        },
        "selection_policy": {
            "canonical_michael_sets": [f"data/{project}/annotations.json" for project in sorted(CURATED)],
            "excluded": "Superseded Michael per-trajectory outputs, earlier Roompacker drafts, revisions, and duplicate combined representations.",
            "review_scope": "Michael's human approval is derived only from a validated saved review matching current revisions, complete unique question coverage, row checksums, approved decisions and combined exports. Earlier researcher approvals apply only to the preserved prior versions. Other contributors' annotations retain their recorded status.",
        },
        "projects": projects,
        "sources": sources,
        "annotations": annotations,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify the committed index without writing")
    args = parser.parse_args()
    from michael_dataset import build as validate_curated
    for project in sorted(CURATED):
        validate_curated(ROOT, project, check=True)
    document = build()
    if args.check:
        if json.loads(OUTPUT.read_text()) != document:
            raise ValueError("Master annotation index is stale; rebuild it")
    else:
        OUTPUT.write_text(json.dumps(document, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(document["summary"], indent=2, ensure_ascii=False))
    print(f"{'Validated' if args.check else 'Wrote'} {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
