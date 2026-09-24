#!/usr/bin/env python3
"""Bundle StartupSimulator drafts and source context for local review."""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT.parent.parent / "data"
OUTPUT = ROOT / "reviewer/data.json"
TRAJECTORIES = [
    ("startupsimulator_01_main-build", "1 · Main build"),
    ("startupsimulator_02_hiring-workers", "2 · Hiring & workers"),
    ("startupsimulator_03_health-stamina", "3 · Health & stamina"),
    ("startupsimulator_04_parkour", "4 · Parkour"),
    ("startupsimulator_05_lighting-power", "5 · Lighting & power"),
    ("startupsimulator_06_miscellaneous", "6 · Miscellaneous"),
]
EVIDENCE = re.compile(r'^D1:(\d+): "(.*)"$', re.DOTALL)


def is_researcher_prompt(text: str) -> bool:
    return not (
        text.startswith("[TASK RESUMPTION]")
        or text.startswith("Could not start the local app:")
    )


def main() -> None:
    trajectories = []
    for folder, title in TRAJECTORIES:
        directory = DATA / folder
        cleaned = json.loads((directory / "cleaned-chat.json").read_text())
        output = json.loads((directory / "output.json").read_text())
        prompt_count = sum(
            message["role"] == "user"
            and is_researcher_prompt(message["content"][0]["text"])
            for message in cleaned
        )
        items = []
        for position, item in enumerate(output["qa"], 1):
            sources = []
            for citation in item["evidence"]:
                match = EVIDENCE.fullmatch(citation)
                if not match:
                    raise ValueError(f"Malformed citation in {folder}: {citation}")
                index = int(match.group(1))
                message = cleaned[index - 1]
                sources.append(
                    {
                        "citation": citation,
                        "index": index,
                        "quote": match.group(2),
                        "role": message["role"],
                        "fullText": message["content"][0]["text"],
                    }
                )
            items.append(
                {
                    "id": f"{folder}:{position}",
                    "position": position,
                    "question": item["question"],
                    "answer": item["answer"],
                    "category": item["category"],
                    "evidence": item["evidence"],
                    "sources": sources,
                }
            )
        trajectories.append(
            {
                "id": folder,
                "title": title,
                "promptCount": prompt_count,
                "messageCount": len(cleaned),
                "items": items,
            }
        )

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "reviewed",
        "trajectories": trajectories,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {sum(len(row['items']) for row in trajectories)} items to {OUTPUT}")


if __name__ == "__main__":
    main()
