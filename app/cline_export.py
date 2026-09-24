from __future__ import annotations

import hashlib
import json
import re
import shutil
from pathlib import Path
from typing import Any, Iterable


USER_INPUT = re.compile(
    r'\s*<user_input(?:\s+[^>]*)?>(?P<body>.*)</user_input>\s*',
    re.DOTALL,
)


def source_prose(message: dict[str, Any]) -> list[str]:
    """Return human-authored prose while excluding Cline tool payloads."""
    role = message.get("role")
    if role not in {"user", "assistant"}:
        return []

    result: list[str] = []
    for block in message.get("content", []):
        if not isinstance(block, dict) or block.get("type") != "text":
            continue
        value = block.get("text")
        if not isinstance(value, str):
            continue
        if role == "user":
            match = USER_INPUT.fullmatch(value)
            if not match:
                continue
            value = match.group("body")
        value = value.strip()
        if value:
            result.append(value)
    return result


def reconstruct(
    raw_documents: Iterable[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    """Build merged, cleaned, and provenance views of Cline sessions."""
    merged: list[dict[str, Any]] = []
    records: list[tuple[dict[str, Any], dict[str, Any]]] = []

    for document in raw_documents:
        session = document["sessionId"]
        for position, message in enumerate(document["messages"]):
            merged.append(
                {
                    "session": session,
                    "original_position": position,
                    "message": message,
                }
            )
            for text in source_prose(message):
                cleaned = {
                    "role": message["role"],
                    "content": [{"type": "text", "text": text}],
                }
                mapping = {
                    "session": session,
                    "original_message_id": message["id"],
                    "timestamp": message["ts"],
                    "role": message["role"],
                    "original_position": position,
                }
                records.append((cleaned, mapping))

    records.sort(key=lambda pair: pair[1]["timestamp"])
    for index, (_, mapping) in enumerate(records, 1):
        mapping["index"] = index

    return merged, [pair[0] for pair in records], [pair[1] for pair in records]


def export_sessions(
    session_files: Iterable[Path],
    data_directory: Path,
    raw_directory: Path,
) -> dict[str, int]:
    """Archive Cline sessions and write ChatQA transcript/provenance files."""
    archives: list[tuple[int, Path, bytes, dict[str, Any]]] = []
    seen_sessions: set[str] = set()

    for source in session_files:
        source = source.expanduser().resolve()
        content = source.read_bytes()
        document = json.loads(content)
        session = document["sessionId"]
        if session in seen_sessions:
            raise ValueError(f"Duplicate Cline session: {session}")
        seen_sessions.add(session)
        first_timestamp = document["messages"][0]["ts"]
        archives.append((first_timestamp, source, content, document))

    if not archives:
        raise ValueError("At least one Cline messages file is required.")
    archives.sort(key=lambda item: item[0])

    data_directory.mkdir(parents=True, exist_ok=True)
    raw_directory.mkdir(parents=True, exist_ok=True)

    manifest: list[dict[str, Any]] = []
    documents: list[dict[str, Any]] = []
    for _, source, content, document in archives:
        destination = raw_directory / source.name
        if destination.exists() and destination.read_bytes() != content:
            raise ValueError(f"Refusing to overwrite a different raw archive: {destination}")
        if not destination.exists():
            shutil.copyfile(source, destination)
        manifest.append(
            {
                "session": document["sessionId"],
                "filename": destination.name,
                "sha256": hashlib.sha256(content).hexdigest(),
                "bytes": len(content),
            }
        )
        documents.append(document)

    merged, cleaned, mapping = reconstruct(documents)
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
    for filename, payload in outputs.items():
        (data_directory / filename).write_text(
            json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

    return {
        "sessions": len(archives),
        "raw_messages": len(merged),
        "cleaned_messages": len(cleaned),
    }
