"""Stable entry point for the StockPicker AI Flask application."""

import os

from app_new import app


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("STOCKAPP_PORT", "5050")))
