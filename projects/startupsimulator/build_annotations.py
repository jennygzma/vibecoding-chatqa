#!/usr/bin/env python3
"""Rebuild selected StartupSimulator transcript views without changing QA drafts."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPOSITORY = ROOT.parent.parent
sys.path.insert(0, str(REPOSITORY))

from app.cline_export import reconstruct  # noqa: E402

DATA = REPOSITORY / "data"
RAW = ROOT / "evidence/raw"
TRAJECTORIES = {
    "startupsimulator_01_main-build": "1789416181284_r3sjo.messages.json",
    "startupsimulator_02_hiring-workers": "1790021597020_f0z98.messages.json",
    "startupsimulator_03_health-stamina": "1790022994528_rjftg.messages.json",
    "startupsimulator_04_parkour": "1790120866861_fsenc.messages.json",
    "startupsimulator_05_lighting-power": "1790203740725_b8m2s.messages.json",
    "startupsimulator_06_miscellaneous": "1790286696836_f1x8l.messages.json",
}


def main() -> None:
    counts = {}
    for folder, filename in TRAJECTORIES.items():
        raw_path = RAW / filename
        content = raw_path.read_bytes()
        document = json.loads(content)
        merged, cleaned, mapping = reconstruct([document])
        manifest = [
            {
                "session": document["sessionId"],
                "filename": filename,
                "sha256": hashlib.sha256(content).hexdigest(),
                "bytes": len(content),
            }
        ]
        destination = DATA / folder
        destination.mkdir(parents=True, exist_ok=True)
        outputs = {
            "chat-history.json": {
                "format": "cline-merged-history-v1",
                "raw_files": manifest,
                "messages": merged,
            },
            "cleaned-chat.json": cleaned,
            "source-map.json": {
                "format": "cline-source-map-v1",
                "messages": mapping,
            },
        }
        for output_name, payload in outputs.items():
            (destination / output_name).write_text(
                json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
        counts[folder] = len(cleaned)
    print(json.dumps(counts, indent=2))
    print("Curated QA drafts were unchanged.")


if __name__ == "__main__":
    main()
