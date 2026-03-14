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

