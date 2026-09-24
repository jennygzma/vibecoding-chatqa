"""Offline regression checks for the packaged StockPicker AI application."""

from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
os.environ["STOCKAPP_DISABLE_PREWARM"] = "1"
sys.path.insert(0, str(BACKEND))

import app_new  # noqa: E402


class BackendTests(unittest.TestCase):
    def setUp(self):
        self.client = app_new.app.test_client()

    def test_health_and_sector_routes(self):
        health = self.client.get("/api/health")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.get_json()["status"], "ok")

        sectors = self.client.get("/api/sectors").get_json()["sectors"]
        self.assertEqual(sectors[0], "all")
        self.assertIn("Technology", sectors)
        self.assertIn("ETFs", sectors)

    @patch("app_new.score_tickers_parallel")
    def test_top_stocks_sorts_and_limits_results(self, score_tickers):
        score_tickers.return_value = [
            {"ticker": "LOW", "score": 41},
            {"ticker": "HIGH", "score": 91},
        ]
        response = self.client.get(
            "/api/top-stocks?sector=Technology&mode=balanced&limit=1"
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["stocks"], [{"ticker": "HIGH", "score": 91}])
        self.assertEqual(payload["total"], 2)
        self.assertEqual(payload["mode"], "balanced")

    @patch("app_new.fetch_and_score")
    def test_score_and_stock_aliases_share_the_same_result(self, fetch):
        fetch.return_value = {"ticker": "AAPL", "score": 88}
        for path in ("/api/score/aapl", "/api/stock/aapl"):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.get_json()["ticker"], "AAPL")
        self.assertTrue(all(call.args[0] == "AAPL" for call in fetch.call_args_list))

    def test_recommendations_are_computed_without_market_requests(self):
        response = self.client.post(
            "/api/recommend",
            json={
                "holdings": [
                    {
                        "ticker": "AAPL",
                        "shares": 2,
                        "currentPrice": 100,
                        "score": 75,
                        "rsi": 50,
                        "sector": "Technology",
                    },
                    {
                        "ticker": "JNJ",
                        "shares": 2,
                        "currentPrice": 100,
                        "score": 60,
                        "rsi": 50,
                        "sector": "Healthcare",
                    },
                ]
            },
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["health"]["wScore"], 67.5)
        self.assertEqual(len(payload["concentration"]), 2)
        self.assertTrue(payload["recommendations"])

    @patch("app_new.yf.Ticker")
    def test_news_hint_scrubs_the_answer(self, ticker):
        ticker.return_value.news = [
            {
                "content": {
                    "title": "AAPL announces a product",
                    "summary": "NASDAQ: AAPL rose after the announcement.",
                    "canonicalUrl": {"url": "https://example.com/article"},
                    "provider": {"displayName": "Example News"},
                    "pubDate": "2026-01-01T00:00:00Z",
                }
            }
        ]
        response = self.client.get("/api/minigame/hint?ticker=AAPL")
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertNotIn("AAPL", payload["title"])
        self.assertNotIn("AAPL", payload["summary"])


class FrontendPackageTests(unittest.TestCase):
    def test_html_references_every_packaged_asset(self):
        html = (ROOT / "frontend/index.html").read_text(encoding="utf-8")
        for filename in ("style.css", "minigame.css", "app.js", "minigame.js"):
            self.assertIn(filename, html)
            self.assertTrue((ROOT / "frontend" / filename).is_file())

    def test_frontend_api_routes_exist_in_backend(self):
        routes = {rule.rule for rule in app_new.app.url_map.iter_rules()}
        expected = {
            "/api/sectors",
            "/api/top-stocks",
            "/api/stock/<ticker>",
            "/api/score/<ticker>",
            "/api/recommend",
            "/api/cache",
            "/api/minigame/hint",
        }
        self.assertTrue(expected.issubset(routes))


if __name__ == "__main__":
    unittest.main()
