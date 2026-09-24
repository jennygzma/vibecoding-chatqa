#!/usr/bin/env python3
"""Rebuild selected StockApp transcript views without changing QA drafts."""
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
    "stockapp_01_main-build": "1789154130654_ttl8f.messages.json",
    "stockapp_02_portfolio-tracker": "1789352968962_awae3.messages.json",
    "stockapp_03_dynamic-visuals": "1790107936445_e7pxv.messages.json",
    "stockapp_04_random-ticker": "1790121022453_9znfg.messages.json",
    "stockapp_05_stock-retrieval-cache": "1790138784059_j63jf.messages.json",
    "stockapp_06_ticker-minigame": "1790197070407_2arpy.messages.json",
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
