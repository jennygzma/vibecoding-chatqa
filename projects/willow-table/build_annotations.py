#!/usr/bin/env python3
"""Rebuild transcript views from archived originals, preserving curated annotations."""
import hashlib
import json
from pathlib import Path

from validate_annotations import data_directory, reconstruct

ROOT = Path(__file__).resolve().parent
DATA = data_directory(ROOT)
RAW = ROOT / "evidence/raw"


def main():
    archives = []
    for path in RAW.glob("*.messages.json"):
        content = path.read_bytes()
        doc = json.loads(content)
        archives.append((doc["messages"][0]["ts"], path, content, doc))
    archives.sort(key=lambda item: item[0])
    if len(archives) != 4:
        raise ValueError("Expected the four reviewed development archives.")
    manifest = [
        {
            "session": doc["sessionId"],
            "filename": path.name,
            "sha256": hashlib.sha256(content).hexdigest(),
            "bytes": len(content),
        }
        for _, path, content, doc in archives
    ]
    merged, cleaned, mapping = reconstruct([item[3] for item in archives])
    documents = {
        "chat-history.json": {"format": "willow-table-merged-history-v1", "raw_files": manifest, "messages": merged},
        "cleaned-chat.json": cleaned,
        "source-map.json": {"format": "willow-table-source-map-v1", "messages": mapping},
    }
    for filename, document in documents.items():
        (DATA / filename).write_text(json.dumps(document, indent=2, ensure_ascii=False) + "\n")
    print(f"Rebuilt {len(cleaned)} message views from four archives. Curated questions were unchanged.")


if __name__ == "__main__":
    main()
