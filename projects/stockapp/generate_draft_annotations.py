#!/usr/bin/env python3
"""Generate review-ready StockApp QA drafts from frozen transcript evidence."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT.parent.parent / "data"


def q(question, answer, category, *evidence):
    return {
        "question": question,
        "answer": answer,
        "category": category,
        "sources": list(evidence),
    }


DRAFTS = {
    "stockapp_01_main-build": [
        q("What was the original purpose of StockApp?", "To provide a local web app that recommends stocks to buy.", 4, (1, "Build a local web app that gives me the best stocks to buy.")),
        q("How many stocks and sectors did the initial StockApp backend score?", "It scored 55 stocks across six sectors.", 4, (11, "scores 55 real stocks across 6 sectors using live Yahoo Finance data")),
        q("Which seven signals were used by StockApp's initial scoring formula?", "Price momentum, EPS growth, moving averages, valuation/P-E, profit margin, debt/equity, and RSI.", 4, (11, "Price Momentum"), (11, "EPS Growth"), (11, "Moving Averages"), (11, "Valuation (P/E)"), (11, "Profit Margin"), (11, "Debt/Equity"), (11, "RSI")),
        q("Why did the initial StockApp load take about 30 seconds?", "It fetched live data for 55 stocks.", 4, (11, "First load takes ~30 seconds (fetching 55 stocks).")),
        q("Was StockApp presented as financial advice?", "No. It was explicitly described as educational or informational only.", 5, (11, "This is for **educational/informational purposes only** — not financial advice.")),
        q("How did the compact redesign change each stock card?", "It replaced roughly 420-pixel-tall cards with 44-pixel table rows.", 4, (25, "Each stock card | ~420px tall (3-column grid) | **44px tall row**")),
        q("Which columns disappear at StockApp's responsive breakpoints?", "EPS, margin, and market cap hide below 900px; P/E and RSI also hide below 600px.", 4, (25, "at 900px the EPS/Margin/Cap columns hide; at 600px P/E and RSI also hide")),
        q("Where does the ticker link in the table view lead?", "It opens that ticker's Yahoo Finance quote page in a new tab.", 4, (31, "linking to `https://finance.yahoo.com/quote/NVDA` that opens in a new tab")),
        q("Why does the Yahoo Finance ticker link stop click propagation?", "So clicking the ticker opens Yahoo Finance without also opening the stock-detail modal.", 4, (31, "prevents the link click from also triggering the row's modal")),
        q("Which formula modes were introduced when randomness was added?", "Balanced, momentum, value, quality, technical, and random modes were available.", 4, (49, "`balanced`"), (49, "`momentum`"), (49, "`value`"), (49, "`quality`"), (49, "`technical`"), (49, "`random`")),
        q("How are weights produced in StockApp's random formula mode?", "They are sampled from a symmetric Dirichlet distribution, clamped to per-signal bounds, and renormalized to sum to one.", 4, (49, "samples from a symmetric Dirichlet(α=2) distribution, clamps each weight to its bounds, then renormalises to guarantee sum = 1.0 exactly")),
        q("Which endpoints accept the formula-mode query parameter?", "Both `/api/top-stocks` and `/api/stock/<ticker>` accept `?mode=`.", 4, (49, "`/api/top-stocks` — accepts `?mode=`"), (49, "`/api/stock/<ticker>` — also accepts `?mode=`")),
        q("Why did selecting Top 20 originally show only ten stocks?", "The backend sliced the response to its default `n` value, so the browser never received more than ten items.", 4, (68, "The backend was slicing results to `n` before sending them — so `stockData` in the browser only ever contained **at most 10 items**")),
        q("How was the Top 20 display bug fixed?", "The backend began returning all scored stocks, while the frontend sorted and sliced the requested Top-N locally.", 4, (68, "the backend now always returns **all scored stocks**"), (68, "`reRender()` now reads `top-n` itself and does `.slice(0, n)` after sorting")),
        q("Does changing Top-N or sort order trigger a backend refresh in the revised UI?", "No. Both use data already held in memory.", 5, (72, "**Top 5 / 10 / 15 / 20** and **Sort** → instant, no network call (already in memory)")),
        q("Which control became the only action that fetched fresh StockApp data?", "The Refresh button became the only control that hits the backend.", 4, (72, "**↻ Refresh** → only thing that hits the backend")),
        q("How is the selected light or dark theme preserved?", "The choice is saved to localStorage and restored on page load.", 4, (81, "saves the choice to `localStorage`"), (81, "restores the saved preference so the chosen mode persists across sessions and refreshes")),
        q("Which statistic became the eighth scoring signal?", "Short interest became the eighth signal.", 4, (97, "`\"short\"` added as the 8th signal")),
        q("How does the short-interest curve treat values above 30 percent?", "It assigns a score of 40 and interprets the stock as a possible value trap.", 4, (97, "| > 30% | 40 | Extreme — possible value trap |")),
    ],
    "stockapp_02_portfolio-tracker": [
        q("What information does the StockApp portfolio tracker save and summarize?", "It saves the share count for each ticker and summarizes total portfolio value, daily profit or loss, and a value-weighted AI score.", 4, (21, "Typing a share count **auto-saves to `localStorage`** (key: `sp_portfolio`)"), (21, "**Total Portfolio Value**"), (21, "**Day P&L**"), (21, "**Weighted AI Score**")),
        q("How is the portfolio's weighted AI score calculated?", "Each holding's AI score is weighted by that holding's value.", 4, (21, "value-weighted average of each holding's AI score")),
        q("How does StockApp limit noise and storage growth in score history?", "It skips entries within five minutes of one another and retains at most 60 points per ticker.", 4, (21, "with a 5-minute dedup guard to prevent noise from rapid refreshes. Up to 60 data points are kept per ticker")),
        q("How is a ticker's historical AI score displayed?", "The detail modal renders a pure Canvas 2D line chart with a gradient, score line, selected labeled points, and date labels.", 4, (21, "a **canvas line chart** rendered in pure Canvas 2D (no library)"), (21, "gradient fill, score line, labeled dots at first/last/min/max points, and date labels on the x-axis")),
        q("Which two alert conditions could initially be configured from a stock modal?", "A current price at or above a target and an AI score at or above a threshold.", 4, (21, "**Target Price ($)** — fires when `currentPrice ≥ target`"), (21, "**Score Threshold** — fires when `score ≥ threshold`")),
        q("What happened when an initial saved alert was triggered?", "StockApp showed a persistent gold banner at the top listing the triggered conditions, with a dismiss button.", 4, (21, "shows a persistent **gold alert banner** at the top of the page listing all triggered conditions with a dismiss button")),
        q("Which three new market groups were explicitly added to StockApp's universe?", "International ADRs, ETFs, and crypto-adjacent stocks.", 4, (21, "**New sector — International ADRs:**"), (21, "**New sector — ETFs:**"), (21, "**New sector — Crypto-Adjacent:**")),
        q("How does the custom-ticker lookup retrieve a score?", "It calls the existing `/api/stock/<ticker>` endpoint and opens the result in the full detail modal.", 4, (21, "It calls the existing `/api/stock/<ticker>` endpoint"), (21, "opens the full detail modal")),
        q("Which action groups can the portfolio recommendation system assign to holdings?", "Trim, rebalance, add, and hold.", 4, (34, "**Action cards** grouped into 🔴 Trim · 🟡 Rebalance · 🟢 Add · ⚪ Hold")),
        q("How is the recommendation tab's portfolio health score computed?", "It starts with the weighted AI score, subtracts up to 20 points for sector concentration, and subtracts up to 10 points for overbought RSI.", 4, (34, "**Portfolio health score** (0–100) = weighted AI score − sector concentration penalty (up to −20) − overbought RSI penalty (up to −10)")),
        q("When does the recommendation system flag a portfolio for sector rebalancing?", "It flags the portfolio when any sector exceeds 45 percent of total value.", 4, (34, "**Rebalance flags** when any sector exceeds 45% of total value")),
        q("What caused the slow cold-start analysis before the backend optimization?", "The backend fetched roughly 130 tickers sequentially, with each ticker taking about one to two seconds, so an all-sector request could take two to four minutes.", 4, (44, "**sequentially per ticker** — for \"All Sectors\" that's ~130 tickers × ~1–2s each"), (44, "= **2–4 minutes**")),
        q("What parallelism was used in the optimized ticker-scoring backend?", "A `ThreadPoolExecutor` fetched tickers in parallel with 20 worker threads.", 4, (189, "**20-thread parallel fetch** via `ThreadPoolExecutor` in `score_tickers_parallel()`")),
        q("How did the optimized backend separate cache lifetimes?", "Price and technical data used a five-minute TTL, while fundamentals such as P/E, EPS, margins, and debt/equity used a four-hour TTL.", 4, (189, "**Two-tier TTL cache**: 5-min for price/technical data, **4-hour for fundamentals** (PE, EPS, margins)")),
        q("What did StockApp's background pre-warm do after server startup?", "After a three-second delay, it fetched 20 popular tickers in parallel.", 4, (189, "Fires 3 seconds after Flask boots"), (189, "Pre-fetches 20 popular tickers in parallel")),
        q("What did the agent recommend doing before adding another StockApp feature?", "Run an end-to-end live test of the recommendations tab by starting `app_new.py`, adding holdings, generating recommendations, and checking that the results render.", 4, (193, "**Feature 8 (Recommendations tab) has never been tested end-to-end**"), (193, "Restart VS Code / open a terminal manually and run `python3 app_new.py`"), (193, "Verify the health card, concentration bars, and action cards actually render")),
        q("How did StockApp alerts evolve from their initial implementation to the later notification system?", "They changed from a gold in-page banner checked on page load or refresh to 30-second polling that could issue browser notifications and an audio ping.", 2, (21, "On **every page load / refresh**, `checkAlerts()` compares live data against saved alerts and shows a persistent **gold alert banner**"), (239, "Every 30 seconds the app silently checks each alert — when triggered you get a browser notification + audio ping")),
        q("Which alert threshold types did the later polling engine support?", "Price above, price below, and score above thresholds.", 4, (239, "checks `price_above` / `price_below` / `score_above` thresholds")),
        q("What visual burst occurs when a real alert threshold is crossed?", "Ten emojis—mostly bells with some service bells, sparkles, and money—fan outward from the toolbar bell and remove themselves after finishing.", 4, (247, "Spawns **10 emojis**: mostly 🔔 with a couple of 🛎️ ✨ 💰 sprinkled in for variety"), (247, "Each `<span>` removes itself from the DOM after it finishes")),
        q("What layers make up the later annoying alert sound?", "Four rapid chirps combine a sawtooth oscillator, a detuned square oscillator, and a 20 Hz square-wave LFO, followed by a descending sawtooth screech.", 4, (252, "**4 rapid chirps**"), (252, "**Sawtooth osc** at 880→660 Hz"), (252, "**Detuned square osc** at 893→671 Hz"), (252, "**20 Hz square LFO**"), (252, "**Descending screech tail**")),
        q("How is the mute-alarm chase button animated?", "It fades between 0.25 and 1.0 opacity and teleports to unpredictable random positions around the screen.", 4, (261, "Opacity range is 0.25–1.0"), (261, "random 600–1200ms delay each time, so the rhythm is unpredictable")),
        q("What action stops the chase alarm and removes its interface?", "Clicking the moving mute button closes the AudioContext and tears down the chase overlay.", 4, (261, "calls `audioCtx.close()` which immediately destroys the Web Audio graph and cuts all sound mid-note"), (261, "calls `_hideMuteChase()` to tear down the UI")),
        q("How did the mute button's teleport timing change after the 20-second deadline was added?", "It changed from a random 600–1200 millisecond interval to an accelerating interval that shrinks from about 900 to 150 milliseconds as time runs out.", 2, (261, "random 600–1200ms delay each time"), (269, "900ms  →  150ms  as the clock runs down")),
        q("What happens if the user fails to mute the alarm within 20 seconds?", "The page runs a four-phase explosion: a flash, 70 shrapnel emojis, cards flung off-screen, and a game-over screen with a Restore Page button.", 4, (269, "A `setTimeout(..., 20_000)` fires `_explodePage(audioCtx)`"), (269, "**2 — Shrapnel**"), (269, "70 emoji particles"), (269, "**3 — Card fling**"), (269, "**4 — Game over screen**"), (269, "**↺ Restore Page** button")),
        q("How does the mute-alarm countdown signal increasing urgency?", "At ten seconds or less it turns gold; at five seconds or less it turns red and flashes rapidly.", 4, (269, "**≤ 10s** → turns **gold**"), (269, "**≤ 5s** → turns **red and flashes** rapidly")),
        q("How did the mute-chase and explosion color scheme change?", "It changed from red accents to a warm brown palette, with lighter brown-orange and tan variants for danger and hover states.", 2, (269, "The red banner label"), (275, "`#8B5E3C` — saddle brown"), (275, "`#c0703a` — lighter brown-orange")),
        q("How does the final animated bump travel around the mute button?", "A bright roughly 55-degree arc in a conic gradient rotates clockwise around the perimeter every 1.8 seconds.", 4, (280, "the bright ~55° arc glides continuously clockwise around the entire perimeter"), (280, "over **1.8 seconds**, linear, infinite")),
    ],
    "stockapp_03_dynamic-visuals": [
        q("What broad visual improvement did the user initially request?", "More dynamic visuals and animations for StockApp.", 4, (1, "the visuals are more dynamic and we have some animation for the StockApp")),
        q("Which two concrete animation features did the user select from the brainstorm?", "A staggered card slide-in and a continuously updating stream of interesting stocks.", 4, (3, "Make a stagger card slide in. Actually make it continuously pump out cool sotcks.")),
        q("How far apart were the stock-card entrance animations staggered?", "They were staggered 55 milliseconds apart.", 4, (14, "Cards are staggered **55ms apart**")),
        q("How often did Live Feed fetch a new random sector and formula combination?", "Every nine seconds.", 4, (14, "**Every 9 seconds**, silently fetches a random sector + formula mode combination")),
        q("Which stock did Live Feed choose from each fetched batch?", "The highest-scored stock that was not already visible.", 4, (14, "**Picks the highest-scored stock** from that batch that isn't already visible in the grid")),
        q("What happened when the Live Feed reached its 30-card cap?", "Older cards were removed from the bottom with a fade-and-slide-right exit.", 4, (14, "**Trims old cards** off the bottom gracefully with a fade+slide-right exit when the cap of 30 is hit")),
        q("What did pausing Live Feed do?", "It stopped the feed and reset its UI state.", 4, (14, "Clicking **`⏸ Pause Feed`** stops everything cleanly and resets all UI state")),
        q("How did a stock card move when hovered?", "It shifted four pixels right and scaled up by 1.2 percent.", 4, (24, "slides right 4px + scales up 1.2%")),
        q("Which value received the largest hover pop on a stock card?", "The AI Score, which scaled up by 18 percent.", 4, (24, "**AI Score** pops scale up **18%** — the biggest number gets the biggest pop")),
        q("What were the two possible outcomes of clicking a stock after rejection was introduced?", "A lucky click opened the detail modal, while a rejected click triggered rejection feedback; each had a 50 percent chance.", 4, (29, "On a **lucky** click (50%)"), (29, "On a **rejected** click (50%)")),
        q("How did the app prevent repeated clicks during the rejection shake?", "It temporarily set the card to `pointer-events: none`.", 4, (29, "briefly becomes `pointer-events: none` so you can't spam-click through it mid-shake")),
        q("What full-screen elements accompanied a rejected stock click?", "A red vignette, a central DENIED stamp overlay, and a red message bar appeared, while the clicked card also shook.", 4, (34, "**1. Red Vignette Flash**"), (34, "**2. Full-Screen Stamp Overlay**"), (34, "**3. Snarky Message Bar**"), (34, "The individual card still gets the **red flash + shake** animation simultaneously")),
        q("Did the denial laugh track require an audio file or CDN?", "No. It was synthesized with the browser's Web Audio API.", 5, (37, "**Zero files, zero CDN, zero permissions.** It's entirely synthesized live using the browser's built-in **Web Audio API**.")),
        q("How many overlapping voices were used for the synthesized laugh track?", "Six overlapping voices.", 4, (37, "built from **6 overlapping voices**")),
        q("How did the requested duration of the red denial screen change?", "It was initially described as fading over 1.4 seconds, then shortened so it was fully gone within exactly one second.", 2, (41, "fades out over the remaining 1.4 seconds"), (43, "fully gone within exactly **1 second**")),
        q("What color was used for the full-screen denial flash?", "A deep emergency red with RGB values 200, 20, and 12.", 4, (41, "solid `rgb(200, 20, 12)` — a deep emergency red")),
    ],
    "stockapp_04_random-ticker": [
        q("Where was the Random ticker button initially placed?", "Next to the Score button in the toolbar's custom-ticker group.", 4, (8, "added right next to the existing **Score ↗** button inside the `.custom-ticker-group`")),
        q("How did the initial Random ticker action choose a stock?", "It chose from the currently loaded `stockData`, with a fallback list of 30 well-known tickers if data had not loaded.", 4, (8, "**Picks from `stockData`**"), (8, "**Falls back to a hardcoded list** of 30 well-known tickers")),
        q("Which existing function did the Random ticker feature reuse?", "It called `lookupCustomTicker()` to fetch the score and open the detail modal.", 4, (8, "calls the existing `lookupCustomTicker()` function")),
        q("What movement did the user first request for the Random button?", "The user wanted it to change location after every press.", 4, (9, "the button changes locations everytime we press it")),
        q("How was the teleporting button kept on screen?", "Its position was calculated within viewport bounds with eight pixels of padding.", 4, (16, "within the safe viewport bounds (8 px padding on all sides so it never clips off-screen)")),
        q("How many clicks were required before the gated Random button performed a stock lookup?", "Five clicks.", 4, (20, "On the **5th click** → reset counter, restore label, and fire the actual lookup")),
        q("What labels appeared during the first four gated clicks?", "The label counted down from “4 more” through “1 more.”", 4, (20, "`🎲 4 more…` → `🎲 3 more…` → `🎲 2 more…` → `🎲 1 more…`")),
        q("How was the Random button made visually transparent?", "Its background, text color, and border were all made transparent.", 4, (26, "**`background: transparent`**"), (26, "**`color: transparent`**"), (26, "**`border: 1px solid transparent`**")),
        q("Why was the Random button's hover shadow removed?", "Because the shared hover shadow would reveal the otherwise invisible button.", 4, (24, "The `.btn:hover` adds a `box-shadow` which would give away the button's location.")),
        q("How did the Random button's behavior change after the invisible five-click version?", "The five-click gate and click teleporting were removed, the button became visible again, and it floated continuously.", 2, (26, "The button is now completely invisible"), (31, "Restored the visible button colors"), (31, "Replaced all the teleport/click-counter logic with a simple **physics loop**")),
        q("What browser mechanism drove the continuously floating Random button?", "A `requestAnimationFrame` physics loop.", 4, (31, "runs every animation frame via `requestAnimationFrame`")),
        q("How did the floating button react at viewport edges?", "It reversed the appropriate velocity so it bounced and stayed fully on-screen.", 4, (31, "checks all 4 viewport edges and **flips the velocity** on contact")),
        q("What was the floating button's initial movement speed?", "It moved at 2.5 pixels per frame.", 4, (31, "fixed speed of **2.5 px/frame**")),
        q("How frequently and for how long did the Random button pause?", "It paused every four to ten seconds for a random duration of 0.8 to 2.5 seconds.", 4, (35, "Waits **4–10 seconds**"), (35, "After **0.8–2.5 seconds**")),
        q("Did the Random button originally choose a new direction after pausing?", "No. That was subsequently fixed by generating a new full-circle random angle on resume.", 2, (37, "**no** — it just resumes in the exact same direction"), (38, "calculates a fresh `angle` (full 360° random)")),
        q("How did the Random button's spin behave while paused and after resuming?", "Its angle froze while paused; after resuming it used a newly randomized clockwise or counter-clockwise speed between one and three degrees per frame.", 4, (43, "Spin stops (angle freezes) while paused"), (43, "between **1–3 deg/frame** with a **random clockwise or counter-clockwise direction**")),
        q("Between which opacity values did the Random button fade?", "It faded between approximately 0.3 and 1.0.", 4, (49, "scales it to **0.3 → 1.0**")),
        q("Why did the random ticker lookup fail in the browser?", "The backend returned literal NaN values, which caused the browser's JSON parser to throw an error.", 4, (58, "`NaN` is **not valid JSON**"), (58, "`JSON.parse()` / `res.json()` in the browser will throw a `SyntaxError`")),
        q("Which fields were observed carrying NaN values during the random-ticker failure?", "RSI and the final sparkline entry.", 4, (58, "in the JSON for `rsi` and the last sparkline value")),
        q("How was invalid numeric data made JSON-safe?", "A recursive sanitizer replaced NaN and positive or negative infinity with `None`, producing JSON null values.", 4, (70, "replaces any `float` that is `NaN`, `+Inf`, or `-Inf` with `None` (→ `null` in JSON)")),
    ],
    "stockapp_05_stock-retrieval-cache": [
        q("What did the user ask the agent to establish before fixing stock retrieval?", "Whether stock retrieval was working at all.", 4, (1, "First figure out if it's working")),
        q("Was StockApp's stock retrieval completely nonfunctional?", "No. The backend and yfinance were working, but the returned data contained three bugs.", 5, (12, "The stock retrieval **was running**"), (12, "but had **3 data bugs**")),
        q("Why was RSI null for retrieved stocks?", "A trailing NaN row for the unfinished trading session contaminated the price calculations.", 4, (7, "`yfinance` now appends a **trailing NaN row** for today's (not-yet-closed) session")),
        q("Which calculations were affected by the trailing NaN price?", "RSI, momentum, moving-average signals, the current-price check, and the sparkline were affected.", 4, (7, "**Same root cause also breaks:** `compute_momentum_score()`, `moving_average_signal()`, `current_price` check, and the sparkline")),
        q("How was the trailing-NaN stock-history problem fixed?", "The code changed the closing-price series to `hist[\"Close\"].dropna()`.", 4, (7, "prices = hist[\"Close\"].dropna()")),
        q("Why was dividend yield reported at 100 times its correct value?", "The code multiplied a yfinance value that was already expressed as a percentage by 100 again.", 4, (7, "`yfinance` already returns `dividendYield` as a **percentage**"), (7, "The code multiplies by 100 again")),
        q("Why could a 0.23 percent daily move appear as 22.7 percent?", "A heuristic multiplied percentage values below one by 100 even though yfinance already returned full percentages.", 4, (7, "a 0.23% move gets multiplied to `22.7%`")),
        q("How long could the StockApp loading spinner remain visible while all tickers were fetched?", "Approximately 30 seconds.", 4, (15, "loading spinner for ~30 seconds")),
        q("Which animation technique replaced destructive card re-rendering?", "The FLIP technique: First, Last, Invert, Play.", 4, (25, "**FLIP animation** (`F`irst → `L`ast → `I`nvert → `P`lay)")),
        q("Why were existing card DOM nodes reused during reordering?", "Reusing them allowed smooth positional animation and kept their sparklines intact.", 4, (19, "card DOM nodes are **reused**"), (19, "so sparklines stay intact too")),
        q("How were new and removed cards handled during Top-N changes?", "New cards slid in from the right, while removed cards disappeared immediately.", 4, (25, "new cards entering slide in from the right; cards leaving are removed instantly")),
        q("How did the ticker-character scramble resolve?", "Characters cycled every 45 milliseconds and resolved from left to right.", 4, (34, "at **45ms per frame**"), (34, "Characters **resolve left-to-right**")),
        q("When did the ticker scramble run?", "It ran after initial loading and again after each sort or filter change.", 4, (34, "Runs once on **initial page load**"), (34, "again after every **sort/filter change**")),
        q("How was a rainbow hue assigned to each stock card?", "The hue was calculated as the card's index divided by the visible total, multiplied by 360.", 4, (43, "`hue = (index / total) * 360`")),
        q("What happened to card colors when the stocks were re-sorted?", "Their hues changed with their new positions so the rainbow still ran from top to bottom.", 4, (43, "their hues update to match the new order"), (43, "the rainbow always runs top to bottom regardless of sort")),
        q("What backend bottleneck motivated in-memory caching?", "Every `/api/top-stocks` request fetched every ticker sequentially from yfinance, taking more than 30 seconds.", 4, (45, "Every `GET /api/top-stocks` call fetches **every ticker sequentially** from yfinance")),
        q("What was the initial cache's granularity and lifetime?", "It cached each ticker separately for five minutes.", 4, (63, "Each ticker is cached individually"), (63, "TTL is **5 minutes**")),
        q("Did changing scoring modes require another yfinance request after caching?", "No. Cached subscores were reweighted with arithmetic instead.", 5, (63, "just re-applies the new weights mathematically — instant, no network at all")),
        q("How much faster was the measured warm cache fetch than the cold fetch?", "The warm fetch took 8 ms versus 445 ms cold, reported as 55 times faster.", 4, (63, "Cold fetch (AAPL, first time) | **445ms**"), (63, "Warm fetch (AAPL, cached) | **8ms** — **55× faster**")),
        q("Which cache structure ultimately replaced the plain dictionary?", "A `collections.OrderedDict` implementing a TTL-aware LRU cache.", 2, (63, "_cache = { \"AAPL\""), (69, "**`_cache: dict` → `_cache: OrderedDict`**")),
        q("How did the final cache evict entries when it exceeded capacity?", "It removed the least recently used entry from the front after exceeding 200 entries.", 4, (69, "When `len(_cache) > CACHE_MAXSIZE` (200), `_cache.popitem(last=False)` removes the front entry")),
        q("What happened to stale LRU cache entries when accessed?", "They were deleted immediately so they did not occupy one of the 200 slots.", 4, (69, "`_cache_get` deletes a stale entry on first contact")),
        q("How many stocks does StockApp display by default after the final change?", "Twenty stocks.", 4, (71, "The page will now load showing 20 stocks by default.")),
    ],
    "stockapp_06_ticker-minigame": [
        q("What feature did the user initially request for StockApp?", "A stock-ticker minigame within the existing application.", 4, (1, "Let's make a stock ticker minigame within the stock app")),
        q("What was the goal of the minigame's first Bull or Bear version?", "Players guessed whether a stock would move up or down from its recent data.", 4, (29, "Guess whether each stock will go **UP 📈** or **DOWN 📉** based on its recent data.")),
        q("How did the minigame concept change after the user's correction?", "It changed from predicting price direction to identifying a ticker from stock statistics and clues.", 2, (29, "Guess whether each stock will go **UP 📈** or **DOWN 📉**"), (30, "give u some numbers about the stock and u have to guess the ticker"), (48, "given stats/numbers about a stock, guess its ticker")),
        q("What is the final goal of Name That Stock?", "Identify the stock's ticker using progressively revealed statistics and clues.", 4, (48, "**given stats/numbers about a stock, guess its ticker**")),
        q("In what order are the minigame's statistical clues revealed?", "Sector, market cap, P/E, RSI, 52-week range, EPS growth, profit margin, debt/equity, sparkline, then dividend yield.", 4, (48, "Sector → Market Cap → P/E Ratio → RSI → 52-Week Range → EPS Growth → Profit Margin → Debt/Equity → Sparkline chart → Dividend Yield")),
        q("How many points are available when guessing from only the sector clue?", "Five hundred points.", 4, (48, "| 1 (sector only) | **500** |")),
        q("How many rounds are played before the Name That Stock game-over screen?", "Seven rounds.", 4, (48, "After 7 rounds → game over screen")),
        q("Which backend route supplies a news hint for the minigame?", "`GET /api/minigame/hint?ticker=AAPL`.", 4, (65, "**`GET /api/minigame/hint?ticker=AAPL`**")),
        q("How does the news-hint endpoint avoid revealing the answer?", "It removes ticker symbols from article titles and summaries and replaces them with a placeholder.", 4, (65, "**Scrubs the ticker symbol** from the title and summary"), (65, "Auto-scrubbed to `[?]` so it doesn't spoil the answer")),
        q("What is the point penalty for using a news hint?", "Seventy-five points are deducted from the current prize.", 4, (65, "**`HINT_PENALTY = 75`**")),
        q("Can a player use multiple news hints during one round?", "No. Only one news hint is allowed per round.", 5, (65, "| One hint per round | Button replaced by \"Hint used\" label once clicked |")),
        q("In what order are ticker letters revealed by repeated hints?", "First letter, last letter, then the middle letters from left to right.", 4, (78, "Priority order: **first → last → middle left-to-right**")),
        q("When does the first ticker letter appear after requesting a hint?", "Immediately when the hint button is clicked, before the news request finishes.", 4, (78, "Calls `_revealNextLetter(ticker)` **immediately** when the button is clicked, before the network request")),
        q("How are exact and misplaced letters displayed after a wrong ticker guess?", "Exact-position letters are green, and letters present in the wrong position are yellow or gold.", 4, (96, "exact position matches → `'correct'` (green)"), (96, "wrong position → `'present'` (yellow)")),
        q("Does an incorrect ticker guess immediately end the round?", "No. The guess is saved to history and the player may continue guessing.", 5, (96, "**Wrong guess** → `answered` stays `false`"), (96, "player can keep guessing")),
        q("How does the letter-scoring algorithm handle duplicate letters?", "It uses two passes and consumes matched target letters so duplicates are counted correctly.", 4, (96, "Standard Wordle two-pass algorithm"), (96, "consume from target pool to handle duplicates correctly")),
        q("Who is the minigame mascot and where does she appear?", "Penny the Bull appears in the bottom-right of the minigame overlay.", 4, (116, "**Penny** is a cute mascot character who lives in the bottom-right corner of the minigame overlay")),
        q("Why does Penny persist when the minigame card re-renders?", "She lives outside the card's DOM.", 4, (116, "outside the card's DOM so she **persists across all re-renders**")),
        q("How does Penny respond to green or yellow feedback from a wrong guess?", "Green matches trigger her close or warm response, while yellow-only matches trigger guidance that the right letters are in the wrong places.", 4, (116, "Wrong guess with ≥1 🟩 green"), (116, "Wrong guess with yellows only")),
        q("How does Penny's anger escalate across repeated wrong guesses?", "The first wrong guess shows mad1, the second mad2, and the third or later guesses trigger mad3 with a rage-shake.", 4, (130, "| 1st wrong | `mad1`"), (130, "| 2nd wrong | `mad2`"), (130, "| 3rd+ wrong | `mad3`")),
        q("When does Penny's wrong-guess anger counter reset?", "It resets to zero at the start of every new round.", 4, (130, "`wrongStreak` (resets to 0 at the start of each new round)")),
        q("Is the ticker minigame the main StockApp interface?", "No. It is an optional modal overlay launched from a toolbar button, while the stock-analysis dashboard remains primary.", 5, (134, "The minigame is correctly a sidebar/modal — not the main focus."), (134, "the stock analysis dashboard remains the **primary focus**")),
        q("Where is the minigame trigger located?", "It is a Minigame button in the top-right toolbar alongside the other utility controls.", 4, (134, "A single `🔍 Minigame` button lives in the **top-right toolbar**")),
        q("How can the minigame overlay be dismissed?", "With Escape or the close button.", 4, (134, "dismissed with Escape or the ✕ button")),
        q("What text remains on the scoring button after its arrow was removed?", "The button reads “Score.”", 4, (136, "the button now just reads **\"Score\"**")),
    ],
}


def main() -> None:
    summary = {}
    for folder, drafts in DRAFTS.items():
        directory = DATA / folder
        cleaned = json.loads((directory / "cleaned-chat.json").read_text(encoding="utf-8"))
        output = {"qa": []}
        seen = set()
        for number, draft in enumerate(drafts, 1):
            key = re.sub(r"\W+", "", draft["question"].casefold())
            if key in seen:
                raise ValueError(f"{folder} item {number}: duplicate question")
            seen.add(key)
            citations = []
            distinct_indices = set()
            for index, quote in draft["sources"]:
                source = cleaned[index - 1]["content"][0]["text"]
                if quote not in source:
                    raise ValueError(
                        f"{folder} item {number}: quote not found in D1:{index}: {quote!r}"
                    )
                citations.append(f'D1:{index}: "{quote}"')
                distinct_indices.add(index)
            if draft["category"] in {1, 2} and len(distinct_indices) < 2:
                raise ValueError(
                    f"{folder} item {number}: category {draft['category']} needs two messages"
                )
            output["qa"].append(
                {
                    "question": draft["question"],
                    "answer": draft["answer"],
                    "evidence": citations,
                    "category": draft["category"],
                }
            )
        (directory / "output.json").write_text(
            json.dumps(output, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        summary[folder] = len(output["qa"])
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
