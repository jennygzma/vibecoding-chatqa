#!/bin/bash
# ── StockPicker AI — one-command launcher ────────────────────────────────────
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo "Stopping StockPicker AI…"
  [ -z "$BACKEND_PID" ] || kill "$BACKEND_PID" 2>/dev/null || true
  [ -z "$FRONTEND_PID" ] || kill "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo ""
echo "=========================================="
echo "  📈  StockPicker AI"
echo "=========================================="
echo ""

# 1. Install Python deps if needed
echo "▶ Checking Python dependencies…"
pip3 install -q -r "$ROOT/backend/requirements.txt"

# 2. Start Flask backend in background
echo "▶ Starting Flask backend on http://127.0.0.1:5050 …"
(cd "$ROOT/backend" && python3 app.py) &
BACKEND_PID=$!
echo "  Flask PID: $BACKEND_PID"

# 3. Serve the frontend over HTTP
echo "▶ Starting frontend on http://127.0.0.1:8000 …"
python3 -m http.server 8000 --bind 127.0.0.1 --directory "$ROOT/frontend" &
FRONTEND_PID=$!

# 4. Wait briefly, then open the frontend
sleep 2
echo "▶ Opening frontend in your browser…"
if command -v open >/dev/null 2>&1; then
  open "http://127.0.0.1:8000/"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://127.0.0.1:8000/"
fi

echo ""
echo "✅  App is running!"
echo "   Frontend : http://127.0.0.1:8000/"
echo "   Backend  : http://127.0.0.1:5050"
echo ""
echo "Press Ctrl+C to stop the server."
echo ""

# Keep the launcher alive while the backend is running.
wait "$BACKEND_PID"
