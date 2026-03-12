# Chat QA Cleaner

Local folder-based CLI + Flask backend that turns chat history into Q/A JSON using an LLM.

## Folder layout
```
/data
  /<chat-folder-name>
    chat-history.json
    notes.txt
    output.json
    rules.json
    refine.json
```

## Setup
1. Create a `.env` file (copy from `.env.example`):
```
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```
2. Install deps:
```
pip install -r requirements.txt
```
Or install as a CLI:
```
pip install -e .
```

## CLI usage
```
chatqa create my-chat
chatqa add my-chat --chat-file /path/to/chat.json --notes-file /path/to/notes.txt
chatqa clean my-chat
chatqa process my-chat
chatqa refine my-chat --notes-file /path/to/notes.txt
chatqa learn-rules my-chat --max-rules 10
chatqa process-all   # now runs QA + rules together
chatqa learn-rules-all --max-rules 10
chatqa status
```

Notes:
- `chatqa process` and `chatqa learn-rules` will reuse `cleaned-chat.json` if it already exists.
- If `cleaned-chat.json` is missing, they will generate it automatically.
- Use `chatqa clean <chat-folder> --force` to regenerate cleaned output.

## Flask API
Run server:
```
python -m app.server
```
Process a folder:
```
curl -X POST http://localhost:5000/process \
  -H 'Content-Type: application/json' \
  -d '{"chat_folder":"my-chat","refine":true}'

curl -X POST http://localhost:5000/learn-rules \
  -H 'Content-Type: application/json' \
  -d '{"chat_folder":"my-chat","max_rules":10}'
```
