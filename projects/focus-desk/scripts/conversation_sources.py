"""Reconstruct public conversation messages from immutable source records."""
import hashlib
import json
import re
from datetime import datetime, timezone

USER_ENVELOPE = re.compile(r'^<user_input mode="[^"]+">([\s\S]*)</user_input>$')

def digest(data):
    return hashlib.sha256(data).hexdigest()

def utc(value):
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value / 1000, timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")

def reconstruct(folder):
    raw = folder / "raw"
    session = json.loads((raw / "session.json").read_text())
    histories = sorted(raw.glob("chat-history*.json"), key=lambda p: (p.name != "chat-history.json", p.name))
    messages, ledger = {}, []
    for path in histories:
        history = json.loads(path.read_text())
        assert history["sessionId"] == session["session_id"]
        for position, item in enumerate(history["messages"]):
            assert len(item["content"]) == 1 and item["content"][0]["type"] == "text"
            assert item["role"] in {"user", "assistant"}
            original = item["content"][0]["text"]
            match = USER_ENVELOPE.fullmatch(original) if item["role"] == "user" else None
            value = match.group(1) if match else original
            location = {"source_path": f"raw/{path.name}", "original_position": position}
            if item["id"] in messages:
                prior = messages[item["id"]]
                assert (prior["text"], prior["role"], prior["original_timestamp"]) == (value, item["role"], item["ts"])
                ledger.append({**location, "reason": "duplicate message in later history snapshot", "represented_by_original_message_id": item["id"]})
                continue
            messages[item["id"]] = {
                **location, "original_block_index": 0,
                "original_message_id": item["id"], "original_timestamp": item["ts"],
                "timestamp_utc": utc(item["ts"]), "role": item["role"], "text": value,
                "phase": "user" if item["role"] == "user" else "final_answer",
                "transformations": ["removed outer user_input envelope"] if match else [],
            }
    finals = [item for item in messages.values() if item["phase"] == "final_answer"]
    matched_finals = set()
    for path in sorted(raw.glob("run-*.jsonl")):
        # Iterate physical JSONL records; splitlines also splits Unicode separators.
        with path.open() as handle:
            for line_number, line in enumerate(handle, 1):
                record = json.loads(line)
                payload = record.get("payload", {})
                location = {"source_path": f"raw/{path.name}", "source_line": line_number}
                is_reply = record.get("type") == "response_item" and payload.get("type") == "message" and payload.get("role") == "assistant"
                if is_reply:
                    assert payload.get("phase") in {"commentary", "final_answer"}, "Unclassified public reply"
                    assert all(block["type"] == "output_text" for block in payload["content"])
                    value = "".join(block["text"] for block in payload["content"])
                    if payload["phase"] == "final_answer":
                        candidates = [item for item in finals if item["text"] == value and item["original_message_id"] not in matched_finals]
                        assert candidates, f"Unmapped final reply in {path}:{line_number}"
                        nearest = min(candidates, key=lambda item: abs(datetime.fromisoformat(item["timestamp_utc"].replace("Z", "+00:00")).timestamp() - datetime.fromisoformat(record["timestamp"].replace("Z", "+00:00")).timestamp()))
                        matched_finals.add(nearest["original_message_id"])
                        ledger.append({**location, "reason": "duplicate final reply; history timestamp is the UI receipt time", "original_message_id": payload["id"], "original_timestamp": record["timestamp"], "represented_by_original_message_id": nearest["original_message_id"]})
                    else:
                        assert payload["id"] not in messages
                        messages[payload["id"]] = {
                            **location, "original_block_index": 0,
                            "original_message_id": payload["id"], "original_timestamp": record["timestamp"],
                            "timestamp_utc": utc(record["timestamp"]), "role": "assistant", "text": value,
                            "phase": "commentary", "transformations": [],
                        }
                    continue
                kind = record.get("type")
                if kind == "response_item":
                    reason = f"non-public-conversation record: {payload.get('type')}/{payload.get('role', '')}; tool or context record retained in raw"
                elif kind == "event_msg":
                    reason = "event stream record; public replies represented by response_item or history"
                else:
                    reason = f"runtime metadata: {kind}"
                ledger.append({**location, "reason": reason})
    assert matched_finals == {item["original_message_id"] for item in finals}, "History final reply lacks original run record"
    for path in sorted(raw.glob("internal-summary-*.jsonl")):
        with path.open() as handle:
            for line_number, line in enumerate(handle, 1):
                json.loads(line)
                ledger.append({"source_path": f"raw/{path.name}", "source_line": line_number,
                    "reason": "internal continuation-summary run; not a public conversation reply"})
    ordered = sorted(messages.values(), key=lambda item: (item["timestamp_utc"], item["source_path"], item.get("source_line", item.get("original_position", 0))))
    assert utc(session["started_at"]) <= ordered[0]["timestamp_utc"]
    return session, ordered, ledger
