"""
Stock Picker API — Flask backend  (optimised)
- Parallel ticker fetching via ThreadPoolExecutor (20 workers)
- Two-tier TTL cache: 5-min price/technical, 4-hour fundamentals
- Background pre-warm on startup for 20 common tickers
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from typing import Optional
from collections import OrderedDict
import os
import re
import time
import logging
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ── Universe ─────────────────────────────────────────────────────────────────
STOCK_UNIVERSE = {
    "Technology": [
        "AAPL", "MSFT", "GOOGL", "META", "NVDA",
        "AMD", "INTC", "CRM", "ADBE", "ORCL",
        "QCOM", "TXN", "AVGO", "MU", "AMAT",
        "PLTR", "NET", "SNOW", "DDOG", "ZS",
        "CRWD", "GTLB", "BILL", "HUBS", "TTD",
    ],
    "Healthcare": [
        "JNJ", "UNH", "LLY", "ABBV", "MRK",
        "PFE", "TMO", "ABT", "DHR", "AMGN",
        "MRNA", "BNTX", "RXRX", "NVCR", "ACAD",
    ],
    "Financials": [
        "JPM", "BAC", "WFC", "GS", "MS",
        "BLK", "AXP", "V", "MA", "SCHW",
        "SQ", "PYPL", "AFRM", "SOFI", "HOOD",
    ],
    "Consumer": [
        "AMZN", "TSLA", "HD", "MCD", "NKE",
        "SBUX", "TGT", "COST", "WMT", "DIS",
        "ABNB", "BKNG", "LYFT", "UBER", "DASH",
    ],
    "Energy": [
        "XOM", "CVX", "COP", "SLB", "EOG",
        "FSLR", "ENPH", "PLUG", "BE", "NEE",
    ],
    "Industrials": [
        "CAT", "HON", "UPS", "LMT", "RTX",
        "DE", "GE", "BA", "NOC", "ETN",
    ],
    "International ADRs": [
        "ASML", "SAP", "NVO", "AZN", "SHEL",
        "BABA", "TSM", "SE", "MELI", "PDD",
        "SONY", "TM", "HMC", "BIDU", "JD",
    ],
    "ETFs": [
        "SPY", "QQQ", "IWM", "DIA", "VTI",
        "XLK", "XLF", "XLV", "XLE", "ARKK",
        "GLD", "SLV", "TLT", "HYG", "VNQ",
    ],
    "Crypto-Adjacent": [
        "COIN", "MSTR", "MARA", "RIOT", "CLSK",
        "HUT", "BTBT", "SQ", "PYPL", "NVDA",
    ],
}

ALL_TICKERS = list(dict.fromkeys(
    t for tickers in STOCK_UNIVERSE.values() for t in tickers
))

# ── Two-tier TTL cache ────────────────────────────────────────────────────────
#  Tier 1 — price/technical (5-min TTL):  _cache  / _cache_lock
#  Tier 2 — fundamentals   (4-hour TTL):  _fund_cache / _fund_lock
#
#  Tier-1 uses an OrderedDict as an LRU eviction queue so memory stays bounded.
#  Tier-2 is a plain dict (fundamentals never need LRU eviction at this scale).

CACHE_TTL      = 300    # 5 min  — price + technical data
FUND_CACHE_TTL = 14400  # 4 hour — PE, EPS growth, margins, D/E
CACHE_MAXSIZE  = 200    # max entries in tier-1 before LRU eviction

_cache:       OrderedDict = OrderedDict()
_cache_lock   = threading.Lock()
_cache_stats  = {"hits": 0, "misses": 0, "evictions": 0}

_fund_cache:  dict = {}
_fund_lock    = threading.Lock()


def _cache_get(ticker: str) -> Optional[dict]:
    """Return tier-1 cached data (fresh within CACHE_TTL), or None."""
    with _cache_lock:
        entry = _cache.get(ticker)
        if entry:
            if (time.time() - entry["ts"]) < CACHE_TTL:
                _cache.move_to_end(ticker)   # promote to MRU
                _cache_stats["hits"] += 1
                return entry["data"]
            del _cache[ticker]               # stale — evict now
        _cache_stats["misses"] += 1
    return None


def _cache_set(ticker: str, data: dict) -> None:
    """Insert / update tier-1 entry, evicting LRU if over capacity."""
    with _cache_lock:
        if ticker in _cache:
            _cache.move_to_end(ticker)
        _cache[ticker] = {"data": data, "ts": time.time()}
        while len(_cache) > CACHE_MAXSIZE:
            _cache.popitem(last=False)       # pop LRU (front)
            _cache_stats["evictions"] += 1


def _cache_clear() -> int:
    """Evict all entries from both tiers; return count cleared."""
    with _cache_lock:
        n = len(_cache)
        _cache.clear()
        _cache_stats["hits"] = _cache_stats["misses"] = _cache_stats["evictions"] = 0
    with _fund_lock:
        _fund_cache.clear()
    return n


def _fund_get(ticker: str) -> Optional[dict]:
    """Return tier-2 fundamentals if fresh, else None."""
    with _fund_lock:
        entry = _fund_cache.get(ticker)
        if entry and (time.time() - entry["ts"]) < FUND_CACHE_TTL:
            return entry["data"]
    return None


def _fund_set(ticker: str, data: dict) -> None:
    with _fund_lock:
        _fund_cache[ticker] = {"data": data, "ts": time.time()}


# ── Scoring weight profiles ───────────────────────────────────────────────────
DEFAULT_WEIGHTS = {
    "momentum":  0.18,
    "eps":       0.18,
    "pe":        0.13,
    "ma":        0.13,
    "margin":    0.10,
    "debt":      0.10,
    "rsi_score": 0.10,
    "short":     0.08,
}

WEIGHT_PROFILES = {
    "balanced":  DEFAULT_WEIGHTS,
    "momentum":  {"momentum": 0.30, "ma": 0.20, "rsi_score": 0.15, "eps": 0.15,
                  "pe": 0.08, "margin": 0.05, "debt": 0.05, "short": 0.02},
    "value":     {"pe": 0.30, "margin": 0.20, "debt": 0.18, "eps": 0.15,
                  "momentum": 0.07, "ma": 0.05, "rsi_score": 0.03, "short": 0.02},
    "quality":   {"margin": 0.25, "debt": 0.25, "eps": 0.20, "pe": 0.15,
                  "momentum": 0.08, "ma": 0.05, "rsi_score": 0.02, "short": 0.00},
    "technical": {"ma": 0.30, "rsi_score": 0.25, "momentum": 0.25, "short": 0.10,
                  "eps": 0.05, "pe": 0.03, "margin": 0.01, "debt": 0.01},
}


def _random_weights() -> dict:
    """Generate a random weight vector that sums to 1.0."""
    rng  = np.random.default_rng()
    keys = list(DEFAULT_WEIGHTS.keys())
    raw  = rng.dirichlet(np.ones(len(keys)))
    return {k: round(float(v), 4) for k, v in zip(keys, raw)}


def _apply_weights(sub_scores: dict, weights: dict) -> float:
    """Compute the weighted AI score (0–100) from sub-scores."""
    total = sum(weights.get(k, 0) * v for k, v in sub_scores.items())
    w_sum = sum(weights.get(k, 0) for k in sub_scores)
    return round(total / w_sum, 1) if w_sum else 0.0



# ── Per-ticker fetch + score ─────────────────────────────────────────────────
def fetch_and_score(ticker: str, weights: dict) -> Optional[dict]:
    """
    Fetch market data for *ticker* and compute a weighted AI score.
    Fast path: if the ticker is in the 5-min price cache, re-score and return.
    Fundamentals (PE, EPS, margin, D/E) are served from the 4-hour cache so
    yfinance .info fires at most once per 4 h per ticker.
    """
    # ── Fast path: price/technical in tier-1 cache ────────────────────────────
    cached = _cache_get(ticker)
    if cached:
        cached = dict(cached)
        cached["score"] = _apply_weights(cached["subScores"], weights)
        return cached

    try:
        tk = yf.Ticker(ticker)

        # ── Price history ─────────────────────────────────────────────────────
        hist = tk.history(period="1y", auto_adjust=True)
        if hist.empty or len(hist) < 30:
            return None

        close   = hist["Close"]
        volume  = hist["Volume"]
        current = float(close.iloc[-1])

        change_1d = float((close.iloc[-1] - close.iloc[-2]) / close.iloc[-2] * 100) \
                    if len(close) >= 2 else 0.0
        mom_1m    = float((close.iloc[-1] - close.iloc[-21]) / close.iloc[-21] * 100) \
                    if len(close) >= 21 else 0.0
        mom_3m    = float((close.iloc[-1] - close.iloc[-63]) / close.iloc[-63] * 100) \
                    if len(close) >= 63 else 0.0

        ma_50  = float(close.tail(50).mean())  if len(close) >= 50  else current
        ma_200 = float(close.tail(200).mean()) if len(close) >= 200 else current

        delta   = close.diff()
        gain    = delta.clip(lower=0).rolling(14).mean()
        loss    = (-delta.clip(upper=0)).rolling(14).mean()
        rs      = gain / loss.replace(0, np.nan)
        rsi_val = float(100 - 100 / (1 + rs.iloc[-1]))
        if np.isnan(rsi_val):
            rsi_val = 50.0

        avg_vol   = float(volume.tail(20).mean())
        spark_raw = close.tail(30).tolist()
        mn, mx    = min(spark_raw), max(spark_raw)
        spark     = [round((v - mn) / (mx - mn) * 100, 1) if mx > mn else 50.0
                     for v in spark_raw]




        # ── Fundamentals: tier-2 cache (4 h TTL) ─────────────────────────────
        fund = _fund_get(ticker)
        if fund is None:
            info       = tk.info
            pe_raw     = info.get("trailingPE")       or info.get("forwardPE")
            eps_raw    = info.get("earningsGrowth")   or info.get("revenueGrowth")
            margin_raw = info.get("profitMargins")
            debt_raw   = info.get("debtToEquity")
            short_raw  = info.get("shortPercentOfFloat") or info.get("shortRatio", 0)
            fund = {
                "pe":           float(pe_raw)     if pe_raw     is not None else None,
                "epsGrowth":    float(eps_raw)    if eps_raw    is not None else None,
                "profitMargin": float(margin_raw) if margin_raw is not None else None,
                "debtToEquity": float(debt_raw)   if debt_raw   is not None else None,
                "shortPct":     float(short_raw)  if short_raw  is not None else 0.0,
                "sector":  info.get("sector", "Unknown"),
                "mktCap":  info.get("marketCap"),
                "name":    info.get("shortName") or info.get("longName") or ticker,
            }
            _fund_set(ticker, fund)

        # ── Sub-scores (each 0–100) ───────────────────────────────────────────
        sub = {}

        blend = mom_1m * 0.4 + mom_3m * 0.6
        sub["momentum"] = min(100.0, max(0.0, 50.0 + blend * 1.5))

        eg = fund["epsGrowth"]
        sub["eps"] = min(100.0, max(0.0, 50.0 + eg * 150)) if eg is not None else 50.0

        pe = fund["pe"]
        sub["pe"] = min(100.0, max(0.0, 100.0 - (pe - 15) * 1.8)) \
                    if (pe is not None and pe > 0) else 50.0

        if current > ma_50 > ma_200:
            sub["ma"] = 85.0
        elif current > ma_200:
            sub["ma"] = 65.0
        elif current > ma_50:
            sub["ma"] = 55.0
        else:
            sub["ma"] = 30.0

        pm = fund["profitMargin"]
        sub["margin"] = min(100.0, max(0.0, 50.0 + pm * 250)) if pm is not None else 50.0

        de = fund["debtToEquity"]
        sub["debt"] = min(100.0, max(0.0, 100.0 - de * 0.5)) if de is not None else 50.0

        if rsi_val < 30:
            sub["rsi_score"] = 80.0
        elif rsi_val < 45:
            sub["rsi_score"] = 65.0
        elif rsi_val < 60:
            sub["rsi_score"] = 55.0
        elif rsi_val < 72:
            sub["rsi_score"] = 40.0
        else:
            sub["rsi_score"] = 20.0

        sp = fund["shortPct"]
        sub["short"] = min(100.0, max(0.0, 100.0 - sp * 300))

        score = _apply_weights(sub, weights)

        result = {
            "ticker":       ticker,
            "name":         fund["name"],
            "currentPrice": round(current, 2),
            "change1d":     round(change_1d, 2),
            "ma50":         round(ma_50,  2),
            "ma200":        round(ma_200, 2),
            "rsi":          round(rsi_val, 1),
            "avgVolume":    int(avg_vol),
            "spark":        spark,
            "pe":           round(fund["pe"], 2)                 if fund["pe"]           is not None else None,
            "epsGrowth":    round(fund["epsGrowth"] * 100, 1)    if fund["epsGrowth"]    is not None else None,
            "profitMargin": round(fund["profitMargin"] * 100, 1) if fund["profitMargin"] is not None else None,
            "debtToEquity": round(fund["debtToEquity"], 2)       if fund["debtToEquity"] is not None else None,
            "sector":       fund["sector"],
            "mktCap":       int(fund["mktCap"]) if fund["mktCap"] is not None else None,
            "subScores":    {k: round(v, 1) for k, v in sub.items()},
            "score":        score,
        }

        _cache_set(ticker, result)
        return result

    except Exception as exc:
        logger.warning("fetch_and_score(%s) failed: %s", ticker, exc)
        return None


# ── Parallel batch scorer ─────────────────────────────────────────────────────
_EXECUTOR = ThreadPoolExecutor(max_workers=20, thread_name_prefix="stock-fetch")


def score_tickers_parallel(tickers: list, weights: dict) -> list:
    """Score tickers in parallel (up to 20 threads). Drops None results."""
    futures = {_EXECUTOR.submit(fetch_and_score, t, weights): t for t in tickers}
    results = []
    for fut in as_completed(futures):
        try:
            res = fut.result(timeout=20)
            if res:
                results.append(res)
        except Exception as exc:
            logger.warning("Worker error for %s: %s", futures[fut], exc)
    return results


# ── Background pre-warm ───────────────────────────────────────────────────────
_PREWARM_TICKERS = [
    "AAPL", "MSFT", "GOOGL", "META", "NVDA",
    "AMZN", "TSLA", "JPM", "V", "JNJ",
    "SPY",  "QQQ",  "AMD",  "PLTR", "CRWD",
    "COIN", "AVGO", "LLY",  "UNH",  "GS",
]


def _prewarm_cache() -> None:
    time.sleep(3)   # wait for Flask to finish booting
    logger.info("Pre-warming cache for %d tickers …", len(_PREWARM_TICKERS))
    score_tickers_parallel(_PREWARM_TICKERS, DEFAULT_WEIGHTS)
    logger.info("Pre-warm complete — cache has %d entries.", len(_cache))


if os.environ.get("STOCKAPP_DISABLE_PREWARM") != "1":
    threading.Thread(target=_prewarm_cache, daemon=True, name="prewarm").start()


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/api/sectors")
def sectors():
    return jsonify({"sectors": ["all"] + list(STOCK_UNIVERSE.keys())})


@app.route("/api/top-stocks")
def top_stocks():
    """
    Return scored stocks for the requested sector, fetched in parallel.
    Query params: sector (default "all"), mode (default "random"), limit (default 50).
    """
    sector = request.args.get("sector", "all").strip()
    mode   = request.args.get("mode",   "random").strip()
    limit  = min(int(request.args.get("limit", 50)), 100)

    weights = _random_weights() if mode == "random" else WEIGHT_PROFILES.get(mode, DEFAULT_WEIGHTS)

    if sector == "all":
        tickers = ALL_TICKERS
    else:
        tickers = STOCK_UNIVERSE.get(sector, [])
        if not tickers:
            return jsonify({"error": f"Unknown sector: {sector}"}), 400

    h_before = _cache_stats["hits"]
    m_before = _cache_stats["misses"]

    results = score_tickers_parallel(tickers, weights)
    results.sort(key=lambda x: x["score"], reverse=True)

    return jsonify({
        "stocks":    results[:limit],
        "total":     len(results),
        "mode":      mode,
        "weights":   weights,
        "generated": datetime.now(timezone.utc).isoformat(),
        "cache": {
            "hits":   _cache_stats["hits"]   - h_before,
            "misses": _cache_stats["misses"] - m_before,
        },
    })

# ── Recommendations helper ────────────────────────────────────────────────────
def _holding_recs(holdings: list, total_value: float) -> list:
    """Generate per-holding action cards (trim / add / hold)."""
    recs = []
    for h in holdings:
        ticker = h.get("ticker", "?")
        score  = h.get("score",  50)
        rsi    = h.get("rsi",    50)
        weight = (h["shares"] * h["currentPrice"]) / total_value * 100 if total_value else 0
        reasons = []
        action  = "hold"

        if score < 40:
            reasons.append(f"AI score is low ({score}) — fundamentals or momentum weak.")
            action = "trim"
        if rsi > 75:
            reasons.append(f"RSI is {rsi} — significantly overbought.")
            action = "trim"
        if weight > 25:
            reasons.append(f"Position is {round(weight, 1)}% of portfolio — oversized.")
            if action != "trim":
                action = "rebalance"

        if score >= 72 and rsi < 55 and weight < 10 and action == "hold":
            reasons.append(f"AI score is strong ({score}) and RSI ({rsi}) has room to run.")
            reasons.append(f"Position is only {round(weight, 1)}% — consider adding.")
            action = "add"

        if action == "hold":
            reasons.append(f"AI score {score} · RSI {rsi} · {round(weight, 1)}% of portfolio.")
            if score >= 60:
                reasons.append("Fundamentals look solid — maintain current allocation.")
            else:
                reasons.append("Score is moderate — watch for deterioration before adding.")

        urgency = (
            "high"   if action == "trim" and (score < 30 or rsi > 80) else
            "medium" if action in ("trim", "rebalance")                else
            "low"
        )
        recs.append({
            "type":    action,
            "ticker":  ticker,
            "title":   f"{ticker} — {action.capitalize()}",
            "reasons": reasons,
            "urgency": urgency,
        })
    return recs



@app.route("/api/recommend", methods=["POST"])
def recommend():
    """
    Analyse holdings and return action cards + a portfolio health score.
    Body: { "holdings": [{ticker, shares, currentPrice, score, rsi,
                          pe, epsGrowth, profitMargin, debtToEquity, sector}] }
    """
    body     = request.get_json(silent=True) or {}
    holdings = body.get("holdings", [])

    if not holdings:
        return jsonify({"error": "No holdings provided"}), 400

    holdings = [h for h in holdings
                if h.get("currentPrice", 0) > 0 and h.get("shares", 0) > 0]
    if not holdings:
        return jsonify({"error": "No valid holdings (need currentPrice and shares > 0)"}), 400

    total_value = sum(h["shares"] * h["currentPrice"] for h in holdings)

    sector_vals: dict = {}
    for h in holdings:
        s = h.get("sector", "Unknown") or "Unknown"
        sector_vals[s] = sector_vals.get(s, 0) + h["shares"] * h["currentPrice"]

    concentration = sorted(
        [{"sector": s, "pct": round(v / total_value * 100)} for s, v in sector_vals.items()],
        key=lambda x: x["pct"], reverse=True,
    )

    w_score = sum(h.get("score", 50) * h["shares"] * h["currentPrice"] for h in holdings) / total_value
    w_rsi   = sum(h.get("rsi",   50) * h["shares"] * h["currentPrice"] for h in holdings) / total_value

    top_pct  = concentration[0]["pct"] if concentration else 0
    div_pen  = 20 if top_pct > 60 else (10 if top_pct > 45 else (5 if top_pct > 35 else 0))
    ob_count = sum(1 for h in holdings if h.get("rsi", 50) > 72)
    rsi_pen  = 10 if ob_count >= len(holdings) * 0.5 else (5 if ob_count else 0)
    hs = max(0, min(100, round(w_score - div_pen - rsi_pen)))
    hl = "Strong" if hs >= 72 else ("Good" if hs >= 58 else ("Fair" if hs >= 44 else "Weak"))

    recs = _holding_recs(holdings, total_value)

    for c in concentration:
        if c["pct"] > 45:
            recs.append({
                "type": "rebalance", "ticker": None,
                "title": f"Rebalance {c['sector']} ({c['pct']}%)",
                "reasons": [
                    f"{c['sector']} is {c['pct']}% of your portfolio — above the 45% guideline.",
                    "Trim the largest position here or add exposure in underrepresented sectors.",
                ],
                "urgency": "high" if c["pct"] > 60 else "medium",
            })

    type_ord    = {"trim": 0, "rebalance": 1, "add": 2, "hold": 3}
    urgency_ord = {"high": 0, "medium": 1, "low": 2}
    recs.sort(key=lambda r: (urgency_ord.get(r["urgency"], 3), type_ord.get(r["type"], 4)))

    n_trim = sum(1 for r in recs if r["type"] == "trim")
    n_add  = sum(1 for r in recs if r["type"] == "add")
    n_rb   = sum(1 for r in recs if r["type"] == "rebalance")
    summary = f"Weighted AI score: {round(w_score, 1)}."
    if n_trim: summary += f" {n_trim} holding{'s' if n_trim > 1 else ''} flagged for trimming."
    if n_rb:   summary += " Sector concentration risk detected."
    if n_add:  summary += f" {n_add} holding{'s' if n_add > 1 else ''} worth adding to."
    if not n_trim and not n_rb:
        summary += " Portfolio looks healthy — stay the course."

    return jsonify({
        "health":          {"score": hs, "label": hl, "summary": summary,
                            "wRsi": round(w_rsi, 1), "wScore": round(w_score, 1)},
        "concentration":   concentration,
        "recommendations": recs,
    })


@app.route("/api/health")
def health_check():
    return jsonify({"status": "ok", "time": datetime.utcnow().isoformat() + "Z"})


@app.route("/api/cache", methods=["GET"])
def cache_status():
    """Return cache state — entries listed LRU-first."""
    now     = time.time()
    entries = []
    with _cache_lock:
        for ticker, entry in _cache.items():
            age = round(now - entry["ts"])
            entries.append({
                "ticker":    ticker,
                "age_s":     age,
                "expires_s": max(0, CACHE_TTL - age),
                "fresh":     age < CACHE_TTL,
            })
    with _fund_lock:
        fund_count = len(_fund_cache)
    return jsonify({
        "ttl":       CACHE_TTL,
        "fund_ttl":  FUND_CACHE_TTL,
        "maxsize":   CACHE_MAXSIZE,
        "size":      len(_cache),
        "fund_size": fund_count,
        "hits":      _cache_stats["hits"],
        "misses":    _cache_stats["misses"],
        "evictions": _cache_stats["evictions"],
        "entries":   entries,
    })


@app.route("/api/cache", methods=["DELETE"])
def cache_bust():
    """Force-evict all cached ticker data."""
    n = _cache_clear()
    logger.info("Cache manually cleared — %d entries evicted", n)
    return jsonify({"cleared": n})


@app.route("/api/minigame/hint")
def minigame_hint():
    """Return a recent article with the ticker scrubbed from its text."""
    ticker = request.args.get("ticker", "").strip().upper()
    if not ticker:
        return jsonify({"error": "ticker param required"}), 400

    try:
        news = yf.Ticker(ticker).news or []

        def normalise(item: dict) -> dict:
            content = item.get("content", item)
            return {
                "title": content.get("title", ""),
                "summary": content.get("summary", content.get("description", "")),
                "url": (
                    content.get("canonicalUrl")
                    or content.get("clickThroughUrl")
                    or {}
                ).get("url", ""),
                "source": (content.get("provider") or {}).get("displayName", ""),
                "publishedAt": content.get(
                    "pubDate", content.get("providerPublishTime", "")
                ),
            }

        articles = [normalise(item) for item in news if item]
        articles = [item for item in articles if item["title"] and item["url"]]
        if not articles:
            return jsonify({"error": "No news available for this ticker"}), 404

        chosen = next(
            (
                item
                for item in articles
                if not item["title"].strip().upper().startswith(ticker)
            ),
            articles[0],
        )

        def scrub(text: str) -> str:
            text = re.sub(
                rf"\b(NYSE|NASDAQ|AMEX)[\s:]+{re.escape(ticker)}\b",
                "[undisclosed]",
                text,
                flags=re.IGNORECASE,
            )
            text = re.sub(
                rf"\({re.escape(ticker)}\)",
                "([?])",
                text,
                flags=re.IGNORECASE,
            )
            return re.sub(rf"\b{re.escape(ticker)}\b", "[?]", text)

        chosen["title"] = scrub(chosen["title"])
        chosen["summary"] = scrub(chosen["summary"])[:280]
        return jsonify(chosen)
    except Exception as exc:
        logger.warning("minigame-hint failed for %s: %s", ticker, exc)
        return jsonify({"error": str(exc)}), 500


@app.route("/api/score/<ticker>")
@app.route("/api/stock/<ticker>")
def score_single(ticker: str):
    """Score a single user-supplied ticker."""
    t       = ticker.upper().strip()
    mode    = request.args.get("mode", "balanced")
    weights = WEIGHT_PROFILES.get(mode, DEFAULT_WEIGHTS)
    result  = fetch_and_score(t, weights)
    if result is None:
        return jsonify({"error": f"Could not fetch data for {t}"}), 404
    return jsonify(result)


if __name__ == "__main__":
    app.run(
        debug=True,
        host="127.0.0.1",
        port=int(os.environ.get("STOCKAPP_PORT", "5050")),
    )
