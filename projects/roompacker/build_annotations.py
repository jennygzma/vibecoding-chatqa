#!/usr/bin/env python3
"""Reconstruct RoomPacker transcript views from frozen archives without changing QA."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPOSITORY = ROOT.parent.parent
sys.path.insert(0, str(REPOSITORY))
from app.cline_export import reconstruct
from prepare_annotations import SESSIONS

TRAJECTORIES = {folder: f"{session}.messages.json" for session, folder, _, _ in SESSIONS}


def main():
    for folder, filename in TRAJECTORIES.items():
        raw = (ROOT / "evidence/raw" / filename).read_bytes()
        document = json.loads(raw)
        merged, cleaned, mapping = reconstruct([document])
        manifest = [{
            "session": document["sessionId"],
            "filename": filename,
            "sha256": hashlib.sha256(raw).hexdigest(),
            "bytes": len(raw),
        }]
        outputs = {
            "chat-history.json": {"format": "cline-merged-history-v1", "raw_files": manifest, "messages": merged},
            "cleaned-chat.json": cleaned,
            "source-map.json": {"format": "cline-source-map-v1", "messages": mapping},
        }
        for name, payload in outputs.items():
            (REPOSITORY / "data" / folder / name).write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
        print(f"{folder}: {len(cleaned)} source messages; QA unchanged")


if __name__ == "__main__":
    main()
