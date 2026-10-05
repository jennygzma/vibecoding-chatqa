#!/usr/bin/env python3
"""Freeze finished RoomPacker conversations and prepare annotation source indices."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPOSITORY = ROOT.parent.parent
sys.path.insert(0, str(REPOSITORY))
from app.cline_export import export_sessions, reconstruct

SESSIONS = [
    ("1790798320886_c7tn7", "roompacker_01_main-build", "Board, tables, editing and deletion", True),
    ("1790803257764_kc4o9", "roompacker_02_sofas-chairs", "Sofas, chairs, rotation and stacking", True),
    ("1790810280725_gh15o", "roompacker_03_shapes-overlaps", "Arbitrary shapes, donuts, overlaps and fracturing", True),
    ("1790985751209_nq50k", "roompacker_04_chaos", "Teleportation, breakage, rotation and easter eggs", True),
    ("1790987708436_qx3ja", "roompacker_05_3d-floating", "3D cube, controls, furniture heights and floating", True),
    ("1791236522109_w8g1z", "roompacker_06_colors-merging", "Transparency revisions, visual effects, colors and merging", True),
]


def main() -> None:
    rows = []
    for session, folder, scope, finished in SESSIONS:
        source = Path.home() / ".cline/data/sessions" / session / f"{session}.messages.json"
        document = json.loads(source.read_text())
        _, cleaned, _ = reconstruct([document])
        prompts = [
            {"citation": f"D1:{index}", "text": message["content"][0]["text"]}
            for index, message in enumerate(cleaned, 1)
            if message["role"] == "user"
            and not message["content"][0]["text"].startswith(
                ("[TASK RESUMPTION]", "Could not start the local app:")
            )
        ]
        if finished:
            export_sessions([source], REPOSITORY / "data" / folder, ROOT / "evidence/raw")
            history = json.loads((REPOSITORY / "data" / folder / "chat-history.json").read_text())
            archived = json.loads((ROOT / "evidence/raw" / source.name).read_text())
            merged, expected_cleaned, mapping = reconstruct([archived])
            assert history["messages"] == merged
            assert json.loads((REPOSITORY / "data" / folder / "cleaned-chat.json").read_text()) == expected_cleaned
            assert json.loads((REPOSITORY / "data" / folder / "source-map.json").read_text())["messages"] == mapping
        rows.append({
            "session": session,
            "dataset": folder,
            "scope": scope,
            "status": "frozen-ready-for-annotation" if finished else "active-not-frozen",
            "source_updated_at": document.get("updated_at"),
            "researcher_prompts": len(prompts),
            "cleaned_messages": len(cleaned),
            "prompts": prompts,
        })
    payload = {
        "status": "prepared-for-annotation",
        "workflow": [
            "Read each frozen cleaned transcript in full before drafting questions.",
            "Draft 5–30 useful QA items per trajectory, with exact D1:N evidence quotes.",
            "Describe intermediate behavior as historical; account for later corrections within each trajectory.",
            "Retain source categories: 1 multi-hop, 2 temporal, 3 open-domain, 4 single-hop, 5 adversarial.",
            "Validate quote locations, raw hashes, reconstruction, categories and duplicate questions.",
            "Build the local reviewer with questions, answers and expandable source context.",
            "Apply researcher review decisions before packaging and adding to the master annotation file.",
        ],
        "trajectories": rows,
        "totals": {
            "trajectories": len(rows),
            "frozen_trajectories": sum(finished for _, _, _, finished in SESSIONS),
            "researcher_prompts": sum(row["researcher_prompts"] for row in rows),
            "frozen_researcher_prompts": sum(row["researcher_prompts"] for row in rows if row["status"].startswith("frozen")),
            "annotations": 0,
        },
    }
    destination = ROOT / "evidence/annotation-preparation.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(payload["totals"], indent=2))
    print(f"Prepared {destination}")


if __name__ == "__main__":
    main()
