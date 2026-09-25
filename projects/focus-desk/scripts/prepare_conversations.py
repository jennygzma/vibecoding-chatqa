from dataset_paths import DATA_ROOT
import json
from pathlib import Path
from conversation_sources import digest, reconstruct, utc

ROOT = DATA_ROOT

def prepare(folder):
    session, originals, ledger = reconstruct(folder)
    cleaned, mapping = [], []
    for number, original in enumerate(originals, 1):
        dia_id = f"{folder.name}:{number}"
        cleaned.append({"role": original["role"], "dia_id": dia_id, "text": original["text"]})
        mapping.append({"dia_id": dia_id, "original_session_id": session["session_id"],
            **{key: value for key, value in original.items() if key != "text"},
            "text_sha256": digest(original["text"].encode())})
    source = {"original_session_id": session["session_id"],
        "session_start_utc": utc(session["started_at"]), "first_message_utc": originals[0]["timestamp_utc"],
        "session_start_source": "raw/session.json:started_at",
        "source_files_sha256": {p.name: digest(p.read_bytes()) for p in sorted((folder / "raw").iterdir()) if p.is_file()},
        "messages": mapping}
    for filename, data in [("cleaned-chat.json", cleaned), ("source-map.json", source), ("cleaning-ledger.json", ledger)]:
        (folder / filename).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    parts = [f"# {folder.name} conversation", "", f"Session: {session['session_id']}", f"Started: {source['session_start_utc']}", ""]
    for item, origin in zip(cleaned, mapping):
        parts.extend([f"## {item['dia_id']} · {item['role']} · {origin['timestamp_utc']}", "", item["text"], ""])
    (folder / "conversation.md").write_text("\n".join(parts))
    return source

if __name__ == "__main__":
    index, legacy_map = [], {}
    readable = ["# Focus Desk feature conversations", "", "Status: In Progress. Review approval pending.", ""]
    features = ["Task management", "Focus timer", "Daily plan", "Insights and CSV export"]
    for folder in sorted(ROOT.glob("D[1-4]")):
        source = prepare(folder)
        index.append({"session_label": folder.name, "feature": features[int(folder.name[1:]) - 1],
            "original_session_id": source["original_session_id"], "started_at_utc": source["session_start_utc"],
            "first_message_at_utc": source["first_message_utc"], "last_message_at_utc": source["messages"][-1]["timestamp_utc"],
            "message_count": len(source["messages"]), "conversation_path": f"{folder.name}/conversation.md",
            "source_map_path": f"{folder.name}/source-map.json", "cleaning_ledger_path": f"{folder.name}/cleaning-ledger.json"})
        old = json.loads((ROOT / "revisions/before-repair" / folder.name / "source-map.json").read_text())
        by_id = {item["original_message_id"]: item["dia_id"] for item in source["messages"]}
        for item in old["messages"]: legacy_map[item["dia_id"]] = by_id[item["original_message_id"]]
        readable.extend([(folder / "conversation.md").read_text().rstrip(), ""])
        print(folder.name, len(source["messages"]), source["session_start_utc"])
    (ROOT / "session-index.json").write_text(json.dumps(index, indent=2) + "\n")
    (ROOT / "message-renumbering.json").write_text(json.dumps(legacy_map, indent=2) + "\n")
    (ROOT / "conversation.md").write_text("\n".join(readable))
