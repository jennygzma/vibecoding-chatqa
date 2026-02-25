from __future__ import annotations

import argparse
import logging
import shutil
from pathlib import Path

from app.processor import (
    DATA_DIR,
    CHAT_FILENAME,
    NOTES_FILENAME,
    process_chat_folder,
)

TRACKER_PATH = DATA_DIR / "processed.json"


def _load_tracker() -> dict:
    if not TRACKER_PATH.exists():
        return {"processed": [], "failed": []}
    try:
        import json

        return json.loads(TRACKER_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"processed": [], "failed": []}


def _save_tracker(tracker: dict) -> None:
    import json

    TRACKER_PATH.write_text(json.dumps(tracker, indent=2) + "\n", encoding="utf-8")


def _mark_processed(folder: str) -> None:
    from datetime import datetime

    tracker = _load_tracker()
    tracker["failed"] = [f for f in tracker.get("failed", []) if f.get("folder") != folder]
    tracker["processed"] = [p for p in tracker.get("processed", []) if p.get("folder") != folder]
    tracker["processed"].append({"folder": folder, "timestamp": datetime.utcnow().isoformat() + "Z"})
    _save_tracker(tracker)


def _mark_failed(folder: str, error: str) -> None:
    from datetime import datetime

    tracker = _load_tracker()
    tracker["failed"] = [f for f in tracker.get("failed", []) if f.get("folder") != folder]
    tracker["failed"].append({"folder": folder, "error": error, "timestamp": datetime.utcnow().isoformat() + "Z"})
    _save_tracker(tracker)

def _ensure_folder(folder_name: str) -> Path:
    folder = DATA_DIR / folder_name
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def cmd_create(args: argparse.Namespace) -> None:
    folder = _ensure_folder(args.chat_folder)
    print(f"Created {folder}")


def cmd_add(args: argparse.Namespace) -> None:
    folder = _ensure_folder(args.chat_folder)

    chat_src = Path(args.chat_file)
    if not chat_src.exists():
        raise FileNotFoundError(chat_src)
    shutil.copy2(chat_src, folder / CHAT_FILENAME)

    if args.notes_file:
        notes_src = Path(args.notes_file)
        if not notes_src.exists():
            raise FileNotFoundError(notes_src)
        shutil.copy2(notes_src, folder / NOTES_FILENAME)

    print(f"Uploaded files to {folder}")


def cmd_process(args: argparse.Namespace) -> None:
    result = process_chat_folder(args.chat_folder)
    print(f"Wrote {result.output_path}")
    print(f"QA count: {len(result.output_json.get('qa', []))}")
    _mark_processed(args.chat_folder)


def cmd_refine(args: argparse.Namespace) -> None:
    folder = _ensure_folder(args.chat_folder)
    if args.notes_file:
        notes_src = Path(args.notes_file)
        if not notes_src.exists():
            raise FileNotFoundError(notes_src)
        shutil.copy2(notes_src, folder / NOTES_FILENAME)

    result = process_chat_folder(args.chat_folder, refine=True)
    print(f"Refined {result.output_path}")
    print(f"QA count: {len(result.output_json.get('qa', []))}")
    _mark_processed(args.chat_folder)


def cmd_process_all(args: argparse.Namespace) -> None:
    data_dir = DATA_DIR
    if not data_dir.exists():
        print(f"No data directory at {data_dir}")
        return

    folders = [p for p in data_dir.iterdir() if p.is_dir()]
    pending = []
    for folder in folders:
        output_path = folder / "output.json"
        chat_path = folder / "chat-history.json"
        alt_chat_path = folder / "chat_history.json"
        if output_path.exists():
            continue
        if chat_path.exists() or alt_chat_path.exists():
            pending.append(folder.name)

    if not pending:
        print("No unprocessed folders found.")
        return

    print(f"Processing {len(pending)} folders...")
    for name in pending:
        try:
            result = process_chat_folder(name)
            print(f"[OK] {name} -> {result.output_path} (qa={len(result.output_json.get('qa', []))})")
            _mark_processed(name)
        except Exception as e:
            print(f"[ERR] {name}: {e}")
            _mark_failed(name, str(e))


def cmd_status(args: argparse.Namespace) -> None:
    data_dir = DATA_DIR
    folders = [p for p in data_dir.iterdir() if p.is_dir()]
    all_folders = sorted([p.name for p in folders])

    tracker = _load_tracker()
    processed = {p.get("folder") for p in tracker.get("processed", [])}
    pending = [f for f in all_folders if f not in processed]

    if args.pending:
        print("\n".join(pending))
        return

    print(f"Processed ({len(processed)}):")
    print("\n".join(sorted(processed)) if processed else "(none)")
    print(f"\nPending ({len(pending)}):")
    print("\n".join(pending) if pending else "(none)")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="chatqa", description="Process chat history into QA JSON.")
    sub = parser.add_subparsers(required=True)

    p_create = sub.add_parser("create", help="Create a chat folder")
    p_create.add_argument("chat_folder")
    p_create.set_defaults(func=cmd_create)

    p_add = sub.add_parser("add", help="Copy chat/notes into the folder")
    p_add.add_argument("chat_folder")
    p_add.add_argument("--chat-file", required=True)
    p_add.add_argument("--notes-file")
    p_add.set_defaults(func=cmd_add)

    p_process = sub.add_parser("process", help="Process a chat folder")
    p_process.add_argument("chat_folder")
    p_process.set_defaults(func=cmd_process)

    p_refine = sub.add_parser("refine", help="Refine output using existing output.json and optional notes/instruction")
    p_refine.add_argument("chat_folder")
    p_refine.add_argument("--notes-file")
    p_refine.set_defaults(func=cmd_refine)

    p_process_all = sub.add_parser("process-all", help="Process all folders without output.json")
    p_process_all.set_defaults(func=cmd_process_all)

    p_status = sub.add_parser("status", help="Show processed vs pending folders")
    p_status.add_argument("--pending", action="store_true", help="Only list pending folders")
    p_status.set_defaults(func=cmd_status)

    return parser


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
