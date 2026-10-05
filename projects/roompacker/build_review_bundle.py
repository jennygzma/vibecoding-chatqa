#!/usr/bin/env python3
"""Bundle RoomPacker drafts and source context for local review."""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT.parent.parent / "data"
OUTPUT = ROOT / "reviewer/data.json"
TRAJECTORIES = [
    ("roompacker_01_main-build", "1 · Board & tables"),
    ("roompacker_02_sofas-chairs", "2 · Sofas & chairs"),
    ("roompacker_03_shapes-overlaps", "3 · Shapes & overlaps"),
    ("roompacker_04_chaos", "4 · Chaos mechanics"),
    ("roompacker_05_3d-floating", "5 · 3D & floating"),
    ("roompacker_06_colors-merging", "6 · Colors & merging"),
]
EVIDENCE = re.compile(r'^D1:(\d+): "(.*)"$', re.DOTALL)


def is_researcher_prompt(text: str) -> bool:
    return not (
        text.startswith("[TASK RESUMPTION]")
        or text.startswith("Could not start the local app:")
    )


def main() -> None:
    groups = json.loads((ROOT / "evidence/curated-review-groups.json").read_text())
    sample = json.loads((DATA / "roompacker/revisions/72-question-draft/vibe_combined.json").read_text())[0]
    lookup = {message["dia_id"]: message for session in range(1, 7) for message in sample["conversation"][f"session_{session}"]}
    trajectories = []
    for group in groups:
        items = []
        for position, item in enumerate(group["items"], 1):
            sources = []
            for citation in item["evidence"]:
                match = re.fullmatch(r'^(D\d+):(\d+): "(.*)"$', citation, re.DOTALL)
                if not match:
                    raise ValueError(f"Malformed citation: {citation}")
                index = int(match.group(2))
                dia_id = f"{match.group(1)}:{index}"
                message = lookup[dia_id]
                sources.append(
                    {
                        "citation": citation,
                        "index": index,
                        "diaId": dia_id,
                        "quote": match.group(3),
                        "role": message["role"],
                        "fullText": message["text"],
                    }
                )
            items.append(
                {
                    "id": f"roompacker-curated-v2:{item['question_id']}",
                    "questionId": item["question_id"],
                    "position": position,
                    "question": item["question"],
                    "answer": item["answer"],
                    "category": item["review_category"],
                    "categoryLabels": item["category"],
                    "evidence": item["evidence"],
                    "sources": sources,
                }
            )
        trajectories.append(
            {
                "id": group["id"],
                "title": group["title"],
                "promptCount": group["promptCount"],
                "messageCount": group["messageCount"],
                "items": items,
            }
        )

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "awaiting-human-review",
        "revision": "roompacker-curated-v2",
        "trajectories": trajectories,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {sum(len(row['items']) for row in trajectories)} items to {OUTPUT}")


if __name__ == "__main__":
    main()
