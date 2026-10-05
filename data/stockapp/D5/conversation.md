# StockApp — stock retrieval cache

## D5:1 — user

Let's fix the stock retrieval. First figure out if it's working

## D5:2 — assistant

I'll start by exploring the project structure to understand the codebase and then investigate the stock retrieval functionality.

## D5:3 — assistant

Let me read the full `app.py` to see the stock retrieval endpoint, and also check if the backend is currently running:

## D5:4 — assistant

Now let me look more closely at the specific issues — particularly the `rsi: null` and the suspicious `dividendYield: 187.0` in the data:

## D5:5 — assistant

I've found the bugs. Let me now do a thorough check to confirm all the issues:

## D5:6 — assistant

I now have a clear picture of all the bugs. Let me also verify the `regularMarketChangePercent` logic issue:

## D5:7 — assistant

All three bugs are confirmed. Here's a clear summary of everything found:

---

## 🔍 Diagnosis: 3 Bugs Found in `backend/app.py`

### Bug 1 — `rsi: null` for all tickers (critical)
**Location:** `fetch_and_score()` → `compute_rsi()` → line 299

**Root cause:** `yfinance` now appends a **trailing NaN row** for today's (not-yet-closed) session when you call `stock.history(period="1y")`. So `prices.iloc[-1]` is `NaN`, which propagates through all rolling calculations → RSI is `NaN` → `_sanitize()` converts it to `null` in the JSON.

**Same root cause also breaks:** `compute_momentum_score()`, `moving_average_signal()`, `current_price` check, and the sparkline (last point is `NaN`).

**Fix:** Drop trailing `NaN` rows from the price series after loading:
```python
prices = hist["Close"].dropna()
```

---

### Bug 2 — `dividendYield` is 100× too large (e.g. `187.0` instead of `1.87%`)
**Location:** line 362

**Root cause:** `yfinance` already returns `dividendYield` as a **percentage** (e.g. `1.87` for 1.87%). The code multiplies by 100 again → `187.0`.

**Fix:** Don't multiply by 100:
```python
"dividendYield": round((info.get("dividendYield") or 0), 2),
```

---

### Bug 3 — `change1d` is 100× too large for small daily moves
**Location:** lines 340–342

**Root cause:** `regularMarketChangePercent` from yfinance is already a **full percentage** (e.g. `0.227` = 0.227%, not a decimal fraction). The code's heuristic — "if `abs(val) < 1`, multiply by 100" — is wrong: a 0.23% move gets multiplied to `22.7%`, while a -3.42% move is correctly left alone.

**Fix:** Remove the multiply-by-100 heuristic entirely; the value is always already in percent:
```python
daily_change = info.get("regularMarketChangePercent", 0) or 0
```

---

Now let me fix all three bugs:

## D5:8 — assistant

Now let me restart the Flask server with the fixes and verify:

## D5:9 — assistant

Flask is running. Let me test the fixed endpoint:

## D5:10 — assistant

The top-stocks endpoint is slow (it fetches all tickers from yfinance). Let me run a quick direct Python test to confirm the fix works without waiting for the full endpoint:

## D5:11 — assistant

All three fixes are verified and working. Let me do a final review of the changed sections in `app.py`:

## D5:12 — assistant

The code looks perfect. Here's a complete summary:

---

## ✅ Summary

The stock retrieval **was running** (Flask server up, yfinance reachable, data returning) but had **3 data bugs** caused by a **yfinance API behavior change**. All three are now fixed in `/Users/michaelyang/Documents/projects/AIM/StockApp/backend/app.py`:

---

### 🐛 Bug 1 — `rsi: null` (and broken momentum/MA) — **Line 302**
**Cause:** yfinance now appends a trailing `NaN` row for today's unfinished trading session when fetching `history(period="1y")`. Every price-based calculation (`compute_rsi`, `compute_momentum_score`, `moving_average_signal`, sparkline) was operating on a series whose last value was `NaN`.

**Fix:**
```python
# Before (broken):
prices = hist["Close"]

# After (fixed):
prices = hist["Close"].dropna()  # drop trailing NaN from today's unfinished session
if len(prices) < 30:
    return None
```

---

### 🐛 Bug 2 — `dividendYield` 100× too large (e.g. `187.0` instead of `1.87%`) — **Line 363**
**Cause:** yfinance returns `dividendYield` already as a percentage-like float (e.g. `1.87` for 1.87%). The code was multiplying it by 100 again.

**Fix:**
```python
# Before (broken):
"dividendYield": round((info.get("dividendYield") or 0) * 100, 2),

# After (fixed):
"dividendYield": round((info.get("dividendYield") or 0), 2),
```

---

### 🐛 Bug 3 — `change1d` 100× too large for small moves — **Lines 342–343**
**Cause:** `regularMarketChangePercent` from yfinance is always already a full percentage (e.g. `0.23` = 0.23%, `-3.42` = -3.42%). The old heuristic "if abs(val) < 1, multiply by 100" turned a 0.23% gain into a bogus 22.7% gain.

**Fix:**
```python
# Before (broken):
daily_change = info.get("regularMarketChangePercent", 0) or 0
if isinstance(daily_change, float) and abs(daily_change) < 1:
    daily_change = daily_change * 100

# After (fixed):
daily_change = info.get("regularMarketChangePercent", 0) or 0
# yfinance already returns this as a full percentage (e.g. -3.42 means -3.42%)
```

**Verified output after fixes:**
```
AAPL: price=338.98  rsi=70.7  change1d=0.23%  divYield=0.32%
JPM:  price=352.04  rsi=44.6  change1d=-3.42% divYield=1.87%
MSFT: price=501.61  rsi=46.9  change1d=-0.72% divYield=0.78%
```

## D5:13 — user

start the app

## D5:14 — assistant

Flask is up. Now open the frontend:

## D5:15 — assistant

App is running! Here's the status:

- **Backend** — Flask is live at **http://127.0.0.1:5000** (PID 50679, logs at `/tmp/flask_out.log`)
- **Frontend** — Opened in your browser at `file:///Users/michaelyang/Documents/projects/AIM/StockApp/frontend/index.html`

The page will show the loading spinner for ~30 seconds while it fetches and scores all the tickers from yfinance. The fixes from earlier (RSI no longer null, correct dividend yields, correct daily % changes) will be live in those results.

## D5:16 — user

make the stocks just change position in the display

## D5:17 — assistant

Let me look at how stocks are currently rendered to understand the display and animation system.

## D5:18 — assistant

Now I have a clear picture. The `reRender()` function currently wipes `grid.innerHTML = ''` and re-inserts all cards from scratch. The plan is to animate cards sliding to their new positions using the **FLIP technique** (First, Last, Invert, Play) — measure where cards are before the reorder, move them to their new positions in the DOM, then animate them from their old positions to their new ones. This gives a smooth positional animation without re-building any cards.

## D5:19 — assistant

Good. I have everything I need. The plan:

1. **`reRender()` in `app.js`** — replace the innerHTML-wipe approach with a FLIP animation:
   - On the **first render**, create all cards normally (existing `card-enter` stagger still works)
   - On **subsequent renders** (sort/filter changes), record each card's `getBoundingClientRect()` before reordering (**First**), move the DOM nodes to their new order (**Last**), compute the delta (**Invert**), then kick off a CSS transition from the inverted offset back to `0,0` (**Play**)
2. **`style.css`** — add a `.card-moving` transition class that animates `transform` smoothly

This means the card DOM nodes are **reused** (never destroyed/recreated on resort), so sparklines stay intact too.

## D5:20 — assistant

Now I also need to clear out the inline `transition`/`transform` styles when a fresh `loadStocks()` call comes in (so the grid resets cleanly for the initial stagger). Let me check how `loadStocks` triggers the first render and also clear the grid on new data load:

## D5:21 — assistant

I need to clear the grid before `reRender()` when new data arrives (so the first-render branch triggers the stagger again):

## D5:22 — assistant

Now add the CSS to make sure inline `transition`/`transform` styles don't conflict with the `.card`'s existing styles — specifically ensuring `will-change` is set so animations are GPU-accelerated:

## D5:23 — assistant

Now verify the final state of the edited region:

## D5:24 — assistant

Everything looks correct. Open the frontend to test:

## D5:25 — assistant

Done. Here's what changed and how it works:

---

## What was done

Replaced the destructive `grid.innerHTML = ''` re-render with a **FLIP animation** (`F`irst → `L`ast → `I`nvert → `P`lay) — the standard technique for animating existing DOM nodes to new positions:

1. **First** — before any DOM change, snapshot each card's `getBoundingClientRect().top`
2. **Last** — reorder the DOM nodes by `appendChild`-ing them in the new sort order (they teleport instantly)
3. **Invert** — compute each card's displacement (`old_top - new_top`) and immediately apply it as `translateY(Δpx)` with `transition: none`, so the card *appears* to still be in the old spot
4. **Play** — on the next double-`requestAnimationFrame` (gives the browser one full paint cycle to register the transform), switch on `transition: transform 0.42s` and remove the inline transform — the card smoothly glides to its final position

**Additional details:**
- **Initial load** still uses the original staggered `card-enter` slide-in (the `grid.children.length === 0` branch)
- **`loadStocks()` (Refresh)** clears the grid first so a fresh stagger plays after new data arrives
- **Top-N changes** (e.g. Top 5 → Top 10) — new cards entering slide in from the right; cards leaving are removed instantly
- **Rank badges** (🥇🥈🥉 / #N) update in place on every reorder
- **`will-change: transform`** added to `.card` so the GPU layer is pre-promoted

## D5:26 — user

let's scramble one of the stocks characters

## D5:27 — assistant

Good. I have all the context I need. The plan: pick one random card after the initial render and run a **Matrix-style character scramble** on its ticker symbol — rapidly cycling through random characters before resolving back to the real ticker. It'll run automatically once on page load, and repeat on every subsequent re-render.

## D5:28 — assistant

Now I'll add the scramble function and wire it into both render paths:

## D5:29 — assistant

Now wire `scrambleRandomCard` into both render paths — after first render (with a short delay so the stagger completes first) and after every subsequent reorder:

## D5:30 — assistant

Now wire it into the FLIP path too — after the move animations settle:

## D5:31 — assistant

Now add the `.scrambling` CSS style so the ticker glows green during the animation:

## D5:32 — assistant

Now verify the final code looks right:

## D5:33 — assistant

Looks perfect. Reload the page:

## D5:34 — assistant

Done. Here's what was added:

---

## What it does

After the cards finish loading/re-sorting, **one randomly chosen ticker symbol** runs a Matrix-style character scramble:

- Each character in the ticker rapidly cycles through random chars from `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&` at **45ms per frame**
- Characters **resolve left-to-right** — the first letter locks in at ~35% through the animation, the last at ~90%, giving it that satisfying decode feel
- The ticker glows **green** (`.scrambling` CSS class) while it's running, then snaps back to the normal accent colour when done
- Runs once on **initial page load** (after the stagger settles), and again after every **sort/filter change** (after the FLIP moves settle) — always on a freshly random card

## D5:35 — user

let's make the colors of the stocks rainbow

## D5:36 — assistant

I can see the card structure clearly. The cleanest approach: assign each card a `--card-hue` CSS custom property based on its index (spreading 0–360° across all visible cards), then use that hue for the left border, background tint, and the ticker symbol color — subtle enough to look great, vivid enough to be unmistakably rainbow.

## D5:37 — assistant

Now also make the ticker symbol and hover sparkline use the card's hue:

## D5:38 — assistant

Also update the sparkline hover glow to use the card hue:

## D5:39 — assistant

Now inject `--card-hue` onto each card element in `buildCard()` in `app.js`. The hue is passed in as a parameter based on the card's index across the full visible set:

## D5:40 — assistant

Now update the two `buildCard` call sites in `reRender()` to pass the hue, and also add a helper to update hues on existing cards during FLIP re-sorts:

## D5:41 — assistant

Now verify the complete reRender and buildCard look correct, then reload:

## D5:42 — assistant

Everything looks exactly right. Open the page:

## D5:43 — assistant

Done. Here's what was changed:

---

## What was done

Each stock card now gets a unique hue evenly distributed across the full color wheel (0°–360°), assigned by position in the sorted list.

**How it works:**
- A `--card-hue` CSS custom property is set directly on each card element via `card.style.setProperty('--card-hue', hue)`, where `hue = (index / total) * 360`
- The CSS uses that variable across 4 things per card:
  - **Background tint** — subtle color wash on the dark background
  - **Border** — full border in the card's hue, plus a brighter/thicker **left accent bar** (the rainbow stripe)
  - **Ticker symbol** — colored to match the card's hue
  - **Hover effects** — box-shadow glow, sparkline drop-shadow, and border brighten all use the same hue

**When you re-sort** (e.g. switch from Score → RSI), cards move to their new positions *and* their hues update to match the new order — so the rainbow always runs top to bottom regardless of sort.

Light mode is also handled with adjusted saturation/lightness values that work on the white background.

## D5:44 — user

What are some ways we can improve(or really just move around) the backend or ui?

## D5:45 — assistant

Good full picture. Here's an honest rundown of what's worth doing and why, organized by impact:

---

## Backend

### 🔴 High impact

**1. In-memory caching**
The biggest pain point. Every `GET /api/top-stocks` call fetches **every ticker sequentially** from yfinance — that's why it takes 30+ seconds. Adding a simple TTL cache (e.g. 5 minutes) means the second load is instant. Just a dict + a timestamp, no extra libraries needed.

**2. Parallel fetching**
`fetch_and_score` runs one ticker at a time in a loop. Wrapping it in `concurrent.futures.ThreadPoolExecutor` would cut the 30s load time down to ~5s with ~10 workers, since it's network I/O bound.

**3. Streaming results**
Instead of waiting for all 100+ tickers to finish before sending anything, stream scored stocks to the frontend one-by-one via Server-Sent Events. The UI would populate progressively rather than staring at a spinner.

---

### 🟡 Medium impact

**4. `/api/top-stocks` returns everything, frontend slices it**
The backend scores all ~100 tickers then sends all of them, but the frontend only shows top 5/10/15/20. The `top_n` could be a query param so the backend only sends what's needed — smaller payloads.

**5. `score_pe` treats P/E of 8 as worse than P/E of 15**
A P/E below 8 scores 55, but 8–15 scores 90. That's backwards for most growth stocks — a very low P/E often means the market sees trouble ahead, but it's lumped in with "cheap." Could add a sector-aware adjustment.

**6. Sector filter hits yfinance for tickers not in that sector anyway**
When you filter to "Technology", it only fetches Tech tickers — good. But the `ALL_TICKERS` dedup means "Crypto-Adjacent" has `SQ`, `PYPL`, `NVDA` duplicated from other sectors, so they get scored twice if sector is "all."

---

### 🟢 Low impact / polish

**7. No error differentiation**
`fetch_and_score` catches all exceptions and returns `None`. A network timeout, a delisted ticker, and a parsing error all look the same. Logging the exception type would help debug bad tickers.

**8. `_sanitize` converts `NaN`/`Inf` to `None` — but `dividendYield` is 0.0 for stocks with no dividend, which looks the same as missing data**
Minor, but worth a `null` distinction in the response.

---

## Frontend

### 🔴 High impact

**9. The 30-second loading spinner with no feedback**
The biggest UX issue. You stare at "Analysing stocks… (~30 s)" with no indication of progress. A streaming approach (idea #3) fixes this, but even a simple periodic message change ("Fetching Technology… Fetching Healthcare…") would help.

**10. Sector change triggers a full backend refetch**
Changing the sector dropdown calls `loadStocks()` which hits the backend again. Since the backend already returns all scored tickers, the frontend could just filter `stockData` locally — instant, no network round trip.

**11. The toolbar is very crowded on mid-size screens**
Sector, Show, Sort, Ticker lookup, Formula, timestamp, theme, portfolio, live feed, refresh — 10 controls in one bar. The custom ticker input and Random button overlap awkwardly. A collapsible second row or grouping controls into a side drawer would help.

---

### 🟡 Medium impact

**12. Sparklines are all the same color**
Every sparkline line is the same accent blue regardless of card hue. Now that cards are rainbow-colored, the sparkline stroke could match `--card-hue` for visual consistency.

**13. Sort by "Today %" sorts descending but P/E and RSI sort ascending — no indication of direction**
The column headers in the table head are not clickable — you have to use the dropdown. Making the column headers themselves clickable sort triggers (like a real data table) would be more intuitive.

**14. Score history is stored in localStorage but never surfaced**
`persistScoreHistory()` saves score over time per ticker but there's no UI that shows it — no trend sparkline, no "up 5 pts since yesterday" indicator on the card.

---

### 🟢 Low impact / polish

**15. The "DENIED" easter egg runs 50% of the time on every card click**
`Math.random() < 0.5` is very aggressive — half of all card clicks get denied instead of opening the detail modal. Could be tuned down or tied to specific tickers.

**16. Weight bar at the bottom doesn't animate when mode changes**
The colored weight segments just swap instantly. A width transition would look much cleaner, especially since mode-switching is the main "wow" interaction.

**17. The live feed cycles through the same `stockData` already in memory**
It doesn't actually fetch new live prices — it just re-shows a random stock from the already-loaded data. The badge says "LIVE" but nothing is actually live.

---

Want to pick any of these to actually implement?

## D5:46 — user

Let's add in-memory caching

## D5:47 — assistant

Clear picture. The plan:

- **Per-ticker cache** — `fetch_and_score` results cached individually by ticker with a timestamp. TTL = 5 minutes. This means a sector switch reuses already-fetched tickers from a recent "all sectors" load, and a Refresh only re-fetches stale ones.
- **`/api/top-stocks` reuses the per-ticker cache** — scoring is the expensive part (yfinance network call), so we cache at that level, not at the endpoint level. Different modes just re-weight the same cached raw data by re-scoring from stored sub-scores.
- **`/api/stock/<ticker>`** (custom lookup) also hits the same cache.
- **`GET /api/cache`** — a small debug endpoint showing cache state (age per ticker, hit/miss counts).
- **`DELETE /api/cache`** — lets you force-bust from the frontend's Refresh button if needed.

## D5:48 — assistant

Now add the cache structure right after the `ALL_TICKERS` line:

## D5:49 — assistant

Now wire `_cache_get` / `_cache_set` into `fetch_and_score`. The cache stores the raw scored dict; modes just re-weight from the cached sub-scores so no yfinance call is needed:

## D5:50 — assistant

Now find the start of `fetch_and_score` to wrap it with cache logic:

## D5:51 — assistant

The key insight: the expensive part is the yfinance network calls. The weights are cheap arithmetic on the sub-scores. So the cache stores the raw data minus the score/subScores, and `fetch_and_score` re-applies the (possibly different) weights on top of cached raw data without hitting the network.

## D5:52 — assistant

Now update the return statement to store raw data in cache before returning, and add `_apply_weights` helper. First, update the return at the end of `fetch_and_score`:

## D5:53 — assistant

Now add the `_apply_weights` helper just before `fetch_and_score`, and add the cache management routes at the end:

## D5:54 — assistant

Now add the `cached_at` timestamp to the response and the two cache management endpoints. Find where the health route is:

## D5:55 — assistant

Now add the two cache management endpoints before the health route:

## D5:56 — assistant

Now wire the `DELETE /api/cache` call into the frontend's Refresh button so a hard refresh (Ctrl+click or a dedicated button) can force fresh data. Let's also show a small "cached" indicator in the UI. First, update `loadStocks` to pass a `force` flag:

## D5:57 — assistant

Now update the Refresh button in `index.html` to support Ctrl+click for a force refresh:

## D5:58 — assistant

Now restart the server and verify it works:

## D5:59 — assistant

Python 3.9 doesn't support `dict | None` union syntax (that's 3.10+). Fix with `Optional`:

## D5:60 — assistant

Server is up. Now test the cache — score one ticker twice and check the `GET /api/cache` endpoint:

## D5:61 — assistant

The numbers say it all. Now test cache bust:

## D5:62 — assistant

Everything works perfectly. Open the app:

## D5:63 — assistant

Here's a summary of everything added:

---

## What was built

### Cache architecture — per-ticker, TTL-based

```
_cache = { "AAPL": {"data": {...}, "ts": 1234567890.0}, ... }
```

Each ticker is cached individually with a Unix timestamp. TTL is **5 minutes**. This is the right granularity because:
- A sector switch (e.g. All → Technology) **reuses any tickers already fetched** from the previous load — no redundant yfinance calls
- A mode change (e.g. Balanced → Momentum) **reuses all cached tickers** and just re-applies the new weights mathematically — instant, no network at all
- A **Refresh** reuses everything still fresh, only re-fetches tickers whose 5 minutes have expired

### `_apply_weights(cached, weights)`
When a cache hit occurs, the result is re-scored from the stored `subScores` dict using the current weights. This means switching from Balanced to Momentum is **pure arithmetic**, not a yfinance round-trip.

### Measured performance
| | Time |
|---|---|
| Cold fetch (AAPL, first time) | **445ms** |
| Warm fetch (AAPL, cached) | **8ms** — **55× faster** |

### New endpoints
| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/cache` | Per-ticker cache state: age, TTL, hit/miss counts |
| `DELETE` | `/api/cache` | Force-evict everything — triggers full re-fetch |

### Frontend
- **Timestamp bar** now shows cache hit/miss ratio: `Updated 3:42:01 PM · Cache 87H / 13M`
- **Ctrl+click (or ⌘+click) the Refresh button** → calls `DELETE /api/cache` first, then re-fetches — guaranteed fresh data from yfinance

## D5:64 — user

Switch the cache structure to something else

## D5:65 — assistant

Good choice. Here's the plan:

- Swap `_cache: dict` for Python's built-in `functools.lru_cache`... actually `lru_cache` doesn't support TTL or manual eviction, so the right tool is **`collections.OrderedDict`** as the backing store for a proper LRU with both a **max size** (e.g. 200 tickers) and a **TTL** (5 min). When the cache is full, the least-recently-*used* entry gets evicted rather than the least-recently-*inserted* one.
- The `_cache_get` promotes a hit to the front of the OrderedDict (MRU end), and `_cache_set` evicts from the back (LRU end) when over capacity.
- All existing behavior (hit/miss stats, `GET /api/cache`, `DELETE /api/cache`, `_apply_weights`) stays intact.

## D5:66 — assistant

Now I have everything. Replace the entire cache block:

## D5:67 — assistant

Now update `GET /api/cache` to expose the new stats (evictions, maxsize) and the LRU order:

## D5:68 — assistant

Restart and test the LRU behavior end-to-end:

## D5:69 — assistant

LRU promotion and eviction order are working exactly right. Done.

---

## What changed

**`_cache: dict` → `_cache: OrderedDict`** — one backing store, two new behaviors:

### LRU promotion on read
```
Before re-fetch:  [AAPL, MSFT, NVDA]  ← LRU ... MRU →
After AAPL read:  [MSFT, NVDA, AAPL]  ← AAPL moved to MRU end
```
`_cache.move_to_end(ticker)` is an O(1) operation on `OrderedDict`.

### Size-bounded eviction on write
When `len(_cache) > CACHE_MAXSIZE` (200), `_cache.popitem(last=False)` removes the front entry — the least recently used ticker — in O(1). A plain `dict` would grow unbounded forever.

### Stale entry eager eviction
Previously, stale entries just sat in the dict until overwritten. Now `_cache_get` deletes a stale entry on first contact so dead weight doesn't count against the 200-slot limit.

### New stats field
`evictions` is now tracked and exposed in `GET /api/cache`, alongside `hits`, `misses`, `maxsize`, and the LRU-ordered entry list.

## D5:70 — user

Let's make it so that the default number of stocks displays 20

## D5:71 — assistant

Done — moved `selected` from `Top 10` to `Top 20` in `index.html`. The page will now load showing 20 stocks by default.
