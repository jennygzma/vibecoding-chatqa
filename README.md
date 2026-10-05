# Chat QA Cleaner

Simple CLI for turning chat history into:
- `output.json` (Q/A pairs)
- `rules.json` (learned user rules)

## Annotator notes
- Read `cleaned-chat.json` first to understand what is actually in scope. Raw chat files usually include extra metadata/noise.
- Add your guidance/questions in `notes.txt` inside each folder.
- Run `chatqa process <folder>` to generate Q/A in `output.json`.
- Run `chatqa learn-rules <folder>` to generate `rules.json`.
- Q/A generation is notes-guided: items in `notes.txt` should be covered, plus extra useful items the model finds from chat context.
- Do a manual review after generation: make outputs human-readable, grounded in the chat, and easy to understand.
- Keep an eye on category quality (multi-hop, temporal, open-domain, single-hop, adversarial) and fix weak labels during review/refine.


## Folder layout
```
/data
  /<chat-folder-name>
    chat-history.json (Jenny uploaded)
    notes.txt
    output.json
    rules.json
    refine.json
```

## Setup
1. Create `.env` (copy from `.env.example`):
```
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```
2. Activate env (if you use conda):
```
conda activate chatqa
```
3. Install:
```
pip install -r requirements.txt
```
Or:
```
pip install -e .
```

## Typical usage
```
chatqa clean <folder>
chatqa process <folder>
chatqa learn-rules <folder>
```

## Importing Cline trajectories

Cline's canonical session files are stored under
`~/.cline/data/sessions/<session-id>/<session-id>.messages.json`. Import one or
more sessions before annotation with:

```sh
chatqa import-cline stockapp \
  --session-file ~/.cline/data/sessions/<id-1>/<id-1>.messages.json \
  --session-file ~/.cline/data/sessions/<id-2>/<id-2>.messages.json
```

This archives the original files byte-for-byte and writes `chat-history.json`,
`cleaned-chat.json`, and `source-map.json`. The cleaned transcript contains only
user/assistant prose; tool calls and results remain available in the raw archive
and merged history. Add `notes.txt`, then run `chatqa process stockapp` to draft
5–30 annotations. Review every generated item and its exact `D1:N` evidence
before treating the set as complete.

## What each command writes
- `chatqa clean <folder>` -> `data/<folder>/cleaned-chat.json`
- `chatqa process <folder>` -> `data/<folder>/output.json`
- `chatqa learn-rules <folder>` -> `data/<folder>/rules.json`

## Batch commands
```
chatqa process-all
chatqa learn-rules-all --max-rules 10
chatqa status
```

`process-all` runs both QA + rules for folders with chat files and no `output.json`.

## Notes
- `process` and `learn-rules` auto-create `cleaned-chat.json` if missing.
- Use `chatqa clean <folder> --force` to regenerate cleaning.
- `chatqa process` does not write `rules.json` (run `learn-rules` for that).

## Master annotations

[The master annotation file](data/master_annotations.json) combines the current
canonical annotation outputs for every project in this repository: 507 QA items
and 845 evidence citations from 14 sources across nine projects. Each item
retains its source file, source index, trajectory, original category value, and
a normalized category list. Source review status and SHA-256 hashes are included
so review states remain distinguishable. Michael's canonical sets now contain
33 StockApp, 31 StartupSimulator and 34 Roompacker questions, curated against
[Focus Desk's structure and conventions](data/focus_desk/README.md). Earlier
per-trajectory outputs and duplicate combined exports are excluded from the master.
Edgar's Pantry Lane is included alongside Focus Desk, Cedar Table and Mahjong;
the existing NoteSense and Snake Game sets retain their recorded status.

Each current Michael dataset provides Focus Desk-style `vibe_combined.json`,
`annotations.json`, a stable-message-ID annotation specification, D1–D6 source maps
and cleaning ledgers, per-question review checksums, category counts, dependencies,
and readable conversations. The master remains a provenance index, while each
project's combined file contains the full conversations and questions.

Rebuild it after adding or revising a dataset with:

```sh
python3 scripts/build_master_annotations.py
python3 scripts/build_master_annotations.py --check
```

Rebuild/validate the three curated source packages and run corruption tests with:

```sh
python3 scripts/michael_dataset.py stockapp startupsimulator roompacker
python3 scripts/michael_dataset.py stockapp startupsimulator roompacker --check
python3 -m unittest discover -s scripts -p 'test_*annotations.py'
python3 -m unittest discover -s scripts -p test_michael_dataset.py
```

The 98 revised Michael questions have an agent editorial review; human approval
is pending. Earlier researcher approvals remain attached to the historical
versions. Categories overlap and describe the reasoning required; they are not
quantity quotas. See the [integration review](data/michael-annotation-review.md).


## Mahjong

[Mahjong](projects/mahjong/README.md) is a local four-player Mahjong game with [100 reviewed annotations](data/mahjong/output.json) from four development sessions. The [review record](projects/mahjong/evidence/REVIEW.md) includes checks, screenshots, and source verification.

## StockApp annotations

[StockApp](projects/stockapp/README.md) contains the runnable StockPicker AI
project plus [33 curated questions](data/stockapp/README.md) across six Cline
trajectories, with the earlier 130-question version preserved.

## StartupSimulator annotations

[StartupSimulator](projects/startupsimulator/README.md) contains the runnable
Zero to One project plus [31 curated questions](data/startupsimulator/README.md)
across six Cline trajectories, with the earlier 136-question version preserved.

## Roompacker

[Roompacker](projects/roompacker/README.md) contains the runnable 3D furniture
sandbox and [34 curated questions](data/roompacker/README.md) across six original
conversations. The 72-question quality draft and original 109-question draft
remain available as history. Packaging fixes a lighting initialization crash;
desktop browser checks cover placement, movement, floating, coloring and merging.

## Cedar Table

[Cedar Table](projects/cedar-table/README.md) is a local four-seat Mahjong game with ten feature conversations and [100 evidence-linked questions](data/cedar_table/vibe_combined.json). The [dataset guide](data/cedar_table/README.md) describes its records and timestamps; the [review](projects/cedar-table/evidence/FEATURES-1-10-READY-FOR-REVIEW.md) contains validation and screenshots.

Status: In Progress. Approval pending. Validate the submission with `python3 scripts/validate_cedar_table.py`.


## Focus Desk

[Focus Desk](projects/focus-desk/README.md) is a local task and focus app with four features, four original conversations, and [60 evidence-linked questions](data/focus_desk/vibe_combined.json). The [dataset guide](data/focus_desk/README.md) explains its records; the [review report](projects/focus-desk/evidence/REVIEW.md) includes verification and browser evidence.

Status: In Progress. Approval pending. Validate the submission with `python3 scripts/validate_focus_desk.py`.


## Pantry Lane

[Pantry Lane](projects/pantry-lane/README.md) is a local kitchen app with pantry inventory, recipes, weekly menus and shopping snapshots. Its [50 evidence-linked questions](data/pantry_lane/vibe_combined.json) come from four original feature conversations. The [dataset guide](data/pantry_lane/README.md) describes the records, and the [review evidence](projects/pantry-lane/evidence/READY-FOR-REVIEW.md) includes tests, screenshots and CSV checks.

Status: In Progress. Approval pending. Validate the published package with `python3 scripts/validate_pantry_lane.py`.
