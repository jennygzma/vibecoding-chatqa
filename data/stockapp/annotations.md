# StockApp annotations

## Q001 — What did the user want the first StockApp to do, and where should it run?

Recommend stocks to buy in a local web app.

Categories: single-session, singlehop, preference.

- D1:1: "Build a local web app that gives me the best stocks to buy."

Review: Directly retrieves the user’s requested purpose and local delivery; it does not endorse the recommendations.

## Q002 — In the main-build conversation, what display changes did the user want to make without refreshing stock data?

Switch display formats; fetch fresh data only when the user clicks the refresh button.

Categories: single-session, singlehop, preference.

- D1:69: "make it so that when i switch formats there's no data refresh. data refresh should only happen when i click the button."

Review: Explicit interaction preference from one user message; scoped to the main-build request because later features add polling.

## Q003 — What caused the initial Top 20 bug, and what division of work fixed it?

The backend returned at most ten stocks; the fix returned all scored stocks and let the frontend sort and slice Top-N.

Categories: single-session, singlehop, knowledge-facts.

- D1:68: "The backend was slicing results to `n` before sending them — so `stockData` in the browser only ever contained **at most 10 items**"
- D1:68: "the backend now always returns **all scored stocks**"
- D1:68: "`reRender()` now reads `top-n` itself and does `.slice(0, n)` after sorting"

Review: The cause and repair are both explicitly stated in D1:68; multiple excerpts from one report do not make this multihop.

## Q004 — How did the reported scoring-signal count change during the main build?

It grew from seven to eight with the addition of short interest.

Categories: single-session, multihop.

- D1:11: "Price Momentum"
- D1:11: "EPS Growth"
- D1:11: "Moving Averages"
- D1:11: "Valuation (P/E)"
- D1:11: "Profit Margin"
- D1:11: "Debt/Equity"
- D1:11: "RSI"
- D1:97: "`"short"` added as the 8th signal"

Review: Counts the seven initially listed signals and combines that baseline with the later eighth-signal report; feature order alone is not temporal.

## Q005 — Why is it useful to sort and limit the already-loaded stock list locally?

It lets display choices respond immediately without waiting for another data request.

Categories: single-session, open-domain.

- D1:68: "the backend now always returns **all scored stocks**"
- D1:68: "`reRender()` now reads `top-n` itself and does `.slice(0, n)` after sorting"
- D1:72: "**Top 5 / 10 / 15 / 20** and **Sort** → instant, no network call (already in memory)"

Review: One-sentence general rationale grounded in frontend sorting/slicing and the reported absence of network calls; no claim about current response speed.

## Q006 — How did the portfolio report weight each holding in its AI-score average?

By the holding’s value.

Categories: single-session, singlehop, knowledge-facts.

- D2:21: "value-weighted average of each holding's AI score"

Review: Direct formula definition from one implementation report, not an assessment of investment quality.

## Q007 — What time and size limits did the score-history report use to control repeated refresh entries?

A five-minute deduplication guard and at most 60 points per ticker.

Categories: single-session, singlehop, temporal, knowledge-facts.

- D2:21: "with a 5-minute dedup guard to prevent noise from rapid refreshes. Up to 60 data points are kept per ticker"

Review: The history interval and retention cap are explicit; temporal refers to the five-minute interval, not development order.

## Q008 — What happened to alert checking between the initial portfolio report and the later polling report?

It moved from page-load/refresh checks with a gold banner to checks every 30 seconds with browser notifications and an audio ping.

Categories: single-session, multihop, temporal.

- D2:21: "On **every page load / refresh**, `checkAlerts()` compares live data against saved alerts and shows a persistent **gold alert banner**"
- D2:239: "Every 30 seconds the app silently checks each alert — when triggered you get a browser notification + audio ping"

Review: Compares two reported alert mechanisms; the explicit 30-second cadence warrants temporal.

## Q009 — What deadline did the user request for the mute-alarm chase?

Twenty seconds before the page “explodes.”

Categories: single-session, singlehop, temporal, preference.

- D2:262: "make it so that if the user doesn't get it in 20 seconds the page "explodes""

Review: One explicit user timing preference; describes the requested playful page effect, not a system failure.

## Q010 — Why is a five-minute guard useful when users repeatedly refresh the score history?

It prevents rapid refreshes from filling the history with near-duplicate samples.

Categories: single-session, open-domain.

- D2:21: "with a 5-minute dedup guard to prevent noise from rapid refreshes. Up to 60 data points are kept per ticker"

Review: One-sentence explanation of the documented deduplication guard; no unsupported promise about statistical accuracy.

## Q011 — What stock-click rejection probability did the user ask for?

A 50% chance of rejecting a click.

Categories: single-session, singlehop, preference.

- D3:25: "Make the stock app have a 50% chance of rejecting your attempt to click on a stock"

Review: Direct numerical preference in the visual-effects conversation.

## Q012 — How long did the user ultimately want the red denial screen to last in the visuals conversation?

One second.

Categories: single-session, singlehop, temporal, preference.

- D3:38: "Make the screen turn red upon denial"
- D3:42: "but only make it last a second"

Review: The later request directly supplies the duration; the earlier message resolves what “it” refers to, without requiring a calculation.

## Q013 — What cadence and selection rule did the Live Feed implementation report describe?

Every nine seconds, fetch a random sector/formula batch and choose its highest-scored stock not already visible.

Categories: single-session, singlehop, temporal.

- D3:14: "**Every 9 seconds**, silently fetches a random sector + formula mode combination"
- D3:14: "**Picks the highest-scored stock** from that batch that isn't already visible in the grid"

Review: Both rules are stated together in D3:14; retrieving them is singlehop despite two excerpts.

## Q014 — What replaced the invisible five-click Random button in the random-ticker conversation?

A visible, continuously floating button with the click-counter and click-teleport logic removed.

Categories: single-session, multihop.

- D4:26: "The button is now completely invisible"
- D4:31: "Restored the visible button colors"
- D4:31: "Replaced all the teleport/click-counter logic with a simple **physics loop**"

Review: Compares the invisible gated version with the subsequent floating version; avoids treating the obsolete five-click gate as current.

## Q015 — What failure did the random-ticker conversation diagnose, and how was it made JSON-safe?

NaN values broke browser JSON parsing; a recursive sanitizer replaced NaN and infinities with null.

Categories: single-session, multihop, knowledge-facts.

- D4:58: "`NaN` is **not valid JSON**"
- D4:58: "`JSON.parse()` / `res.json()` in the browser will throw a `SyntaxError`"
- D4:70: "replaces any `float` that is `NaN`, `+Inf`, or `-Inf` with `None` (→ `null` in JSON)"

Review: Links the D4:58 failure diagnosis to the D4:70 repair; these are historical reports, not a new runtime verification.

## Q016 — How long did the floating Random button pause, and how often did those pauses occur?

Pauses lasted 0.8–2.5 seconds, after 4–10 seconds of movement.

Categories: single-session, singlehop, temporal.

- D4:35: "Waits **4–10 seconds**"
- D4:35: "After **0.8–2.5 seconds**"

Review: Both timing ranges are directly reported in D4:35.

## Q017 — What data-cleaning change did the retrieval conversation report for the trailing-NaN price-history bug?

Use hist["Close"].dropna() before the price calculations.

Categories: single-session, singlehop, knowledge-facts.

- D5:7: "`yfinance` now appends a **trailing NaN row** for today's (not-yet-closed) session"
- D5:7: "prices = hist["Close"].dropna()"

Review: Diagnosis and repair appear in D5:7; answer is scoped to this recorded bug rather than claiming a permanent provider API contract.

## Q018 — How did the retrieval report explain the 100-fold dividend-yield error?

The returned value was already a percentage, but the code multiplied it by 100 again.

Categories: single-session, singlehop, knowledge-facts.

- D5:7: "`yfinance` already returns `dividendYield` as a **percentage**"
- D5:7: "The code multiplies by 100 again"

Review: Direct retrieval of a recorded units error; no current financial-data claim.

## Q019 — What did the caching report say happens when the scoring mode changes?

Reapply weights to cached subscores without another yfinance request.

Categories: single-session, singlehop, knowledge-facts.

- D5:63: "just re-applies the new weights mathematically — instant, no network at all"

Review: Explicit distinction between cached raw/subscore data and derived scoring weights.

## Q020 — What cache-eviction behavior was added when the plain dictionary became an OrderedDict?

A TTL-aware LRU cache removed the least recently used entry when the cache exceeded 200 entries.

Categories: single-session, singlehop, knowledge-facts.

- D5:69: "When `len(_cache) > CACHE_MAXSIZE` (200), `_cache.popitem(last=False)` removes the front entry"
- D5:69: "**`_cache: dict` → `_cache: OrderedDict`**"

Review: The final structure and eviction rule are both stated in D5:69; no multihop label is earned just by describing a replacement.

## Q021 — Why should a mode change reweight cached subscores instead of refetching unchanged inputs?

It avoids repeating data retrieval when only the scoring formula has changed.

Categories: single-session, open-domain.

- D5:63: "just re-applies the new weights mathematically — instant, no network at all"

Review: One-sentence design rationale based on the reported reweighting behavior, without a measured latency claim.

## Q022 — How did the user correct the first minigame concept?

The user wanted players to identify a ticker from stock numbers, rather than predict whether its price would go up or down.

Categories: single-session, multihop, preference.

- D6:29: "Guess whether each stock will go **UP 📈** or **DOWN 📉**"
- D6:30: "give u some numbers about the stock and u have to guess the ticker"
- D6:48: "given stats/numbers about a stock, guess its ticker"

Review: Combines the agent’s first concept, the user correction, and the revised description; chronology is not independently temporal.

## Q023 — What did the news-hint report do to avoid directly giving away the ticker?

Scrub the ticker symbol from the article title and summary, replacing it with a placeholder.

Categories: single-session, singlehop, knowledge-facts.

- D6:65: "**Scrubs the ticker symbol** from the title and summary"
- D6:65: "Auto-scrubbed to `[?]` so it doesn't spoil the answer"

Review: Directly reported redaction behavior; does not claim that the remaining news cannot indirectly reveal the company.

## Q024 — In what order did the letter-hint report reveal a ticker’s letters?

First, last, then the middle letters from left to right.

Categories: single-session, singlehop.

- D6:78: "Priority order: **first → last → middle left-to-right**"

Review: Direct positional ordering, not temporal reasoning; does not preserve the superseded one-hint-per-round claim.

## Q025 — What letter-feedback rule did the minigame report use after a wrong guess?

Green for an exact position; yellow for a letter present elsewhere in the ticker.

Categories: single-session, singlehop, knowledge-facts.

- D6:96: "exact position matches → `'correct'` (green)"
- D6:96: "wrong position → `'present'` (yellow)"

Review: Two feedback outcomes explicitly defined in one source message.

## Q026 — Why consume target letters when assigning yellow feedback in a ticker-guessing game?

It prevents repeated letters in a guess from receiving more matches than the target actually contains.

Categories: single-session, open-domain.

- D6:96: "Standard Wordle two-pass algorithm"
- D6:96: "consume from target pool to handle duplicates correctly"

Review: One-sentence inference from the stated two-pass algorithm and target-pool consumption; no additional implementation guarantee.

## Q027 — What place did the user want the ticker minigame to have within StockApp?

A secondary sidebar-style feature, with stock analysis remaining the main focus.

Categories: single-session, singlehop, preference.

- D6:131: "verify that the ticker game is a sidebar thing and not the main focus."

Review: Direct user priority; “sidebar-style” describes the request and does not falsely identify the implementation as a literal sidebar.

## Q028 — How do the main-build refresh request and the later Live Feed report differ in when they fetch data?

The main-build request makes refresh deliberate; Live Feed adds automatic fetches every nine seconds while enabled.

Categories: multi-session, multihop, temporal.

- D1:69: "data refresh should only happen when i click the button."
- D3:14: "**Every 9 seconds**, silently fetches a random sector + formula mode combination"

Review: Compares an earlier interaction requirement with a later reported feature; neither is silently declared the universal final rule.

Session necessity: D1 supplies the explicit-refresh preference; D3 supplies the automatic nine-second feed, which D1 does not describe.

## Q029 — What different rate limits were reported for saving score history and polling alerts versus loading Live Feed stocks?

History uses a five-minute deduplication guard, alerts poll every 30 seconds, and Live Feed fetches every nine seconds.

Categories: multi-session, multihop, temporal.

- D2:21: "with a 5-minute dedup guard to prevent noise from rapid refreshes. Up to 60 data points are kept per ticker"
- D2:239: "Every 30 seconds the app silently checks each alert — when triggered you get a browser notification + audio ping"
- D3:14: "**Every 9 seconds**, silently fetches a random sector + formula mode combination"

Review: Separates three clocks with different purposes; the answer does not confuse storage deduplication with network polling.

Session necessity: D2 contains the history and alert timing; D3 contains the separate feed cadence.

## Q030 — How do the random-ticker sanitizer and the later price-history cleanup address different stages of the NaN problem?

The sanitizer makes the response parseable; dropping NaN price rows addresses the inputs to calculations.

Categories: multi-session, multihop, knowledge-facts.

- D4:58: "`NaN` is **not valid JSON**"
- D4:58: "`JSON.parse()` / `res.json()` in the browser will throw a `SyntaxError`"
- D4:70: "replaces any `float` that is `NaN`, `+Inf`, or `-Inf` with `None` (→ `null` in JSON)"
- D5:7: "`yfinance` now appends a **trailing NaN row** for today's (not-yet-closed) session"
- D5:7: "prices = hist["Close"].dropna()"

Review: Distinguishes transport validity from calculation inputs using both recorded diagnoses and repairs.

Session necessity: D4 gives response sanitization; D5 gives price-series cleanup. Neither quoted repair alone establishes both stages.

## Q031 — Which earlier Top 20 fix supports the later request to show 20 stocks by default?

Returning all scored stocks and slicing Top-N in the frontend supplies enough data for the later 20-stock default.

Categories: multi-session, multihop.

- D1:68: "the backend now always returns **all scored stocks**"
- D1:68: "`reRender()` now reads `top-n` itself and does `.slice(0, n)` after sorting"
- D5:70: "Let's make it so that the default number of stocks displays 20"

Review: Connects the earlier data-supply fix with a separate later default-setting request.

Session necessity: D1 explains why 20 results can be displayed; D5 supplies the user’s desired default.

## Q032 — Which earlier ticker-link rule should keep link navigation separate from the later stock-row rejection?

Stopping click propagation lets the ticker link open Yahoo Finance without invoking the row handler; the later rejection report applies to clicks that reach the stock-row interaction.

Categories: multi-session, multihop, knowledge-facts.

- D1:31: "- **Row (table view):** The ticker symbol (e.g. `NVDA`) is now an `<a>` tag linking to `https://finance.yahoo.com/quote/NVDA` that opens in a new tab. `onclick="event.stopPropagation()"` prevents the link click from also triggering the row's modal — so clicking the ticker = Yahoo Finance, clicking anywhere else on the row = modal."
- D3:29: "### On a **lucky** click (50%)"

Review: D1 supplies the event-propagation boundary; D3 supplies the later stock-click rejection. This is an integration of reported routing, not a final-browser verification.

Session necessity: D1 supplies the event-propagation boundary; D3 supplies the later stock-click rejection. This is an integration of reported routing, not a final-browser verification.

## Q033 — How do formula weights and portfolio weights operate at different levels?

Formula weights combine signals into a stock score; portfolio weighting combines holdings’ stock scores according to the value of each holding.

Categories: multi-session, multihop, knowledge-facts.

- D1:49: "- `openModal()` — each subscore row now shows `×15%` (etc.) in accent blue next to the signal name, showing exactly how much that signal contributed to this particular run's score"
- D2:21: "- **Weighted AI Score** — value-weighted average of each holding's AI score"

Review: D1 supplies within-stock signal weighting; D2 supplies between-holding value weighting. Both sessions are necessary to distinguish the two levels.

Session necessity: D1 supplies within-stock signal weighting; D2 supplies between-holding value weighting. Both sessions are necessary to distinguish the two levels.

## Q034 — How did the compact-layout report reduce each stock card’s height?

From roughly 420 pixels to a 44-pixel row, while retaining detail in the modal.

Categories: single-session, singlehop, knowledge-facts.

- D1:25: "| Each stock card | ~420px tall (3-column grid) | **44px tall row** |"
- D1:25: "**Click a row** to open the full detail modal — all the rich info (score breakdown bars, rationale, metrics, 52-week range) is still there, just out of the way on the main view."

Review: Direct retrieval of a reported UI sizing change.

## Q035 — What happened when a user clicked a ticker link rather than the rest of its row?

The ticker opened Yahoo Finance in a new tab; stopping propagation prevented that click from also opening the stock modal.

Categories: single-session, singlehop, knowledge-facts.

- D1:31: "- **Row (table view):** The ticker symbol (e.g. `NVDA`) is now an `<a>` tag linking to `https://finance.yahoo.com/quote/NVDA` that opens in a new tab. `onclick="event.stopPropagation()"` prevents the link click from also triggering the row's modal — so clicking the ticker = Yahoo Finance, clicking anywhere else on the row = modal."

Review: Retrieve explicit event-routing behavior.

## Q036 — How did the random-formula report produce bounded weights summing to one?

Sample a symmetric Dirichlet distribution with α = 2, clamp weights to signal bounds, then renormalize.

Categories: single-session, singlehop, knowledge-facts.

- D1:49: "- `generate_random_weights()` — samples from a symmetric Dirichlet(α=2) distribution, clamps each weight to its bounds, then renormalises to guarantee sum = 1.0 exactly"

Review: The ordered algorithm is directly described, not inferred.

## Q037 — What kept the chosen light or dark theme after a reload?

Saving the choice in localStorage and applying it before rendering on page load.

Categories: single-session, singlehop, knowledge-facts.

- D1:81: "- `toggleTheme()` — toggles `body.light`, flips the button icon between `☾` (dark) and `☀` (light), saves the choice to `localStorage`"
- D1:81: "- `applyStoredTheme()` — runs on page load before anything renders, restores the saved preference so the chosen mode persists across sessions and refreshes"

Review: Retrieve the persistence mechanism without attributing an assistant choice to the user.

## Q038 — What short-interest score did the report assign above 30%, and what interpretation accompanied it?

40, interpreted as an extreme level that could indicate a value trap.

Categories: single-session, singlehop, knowledge-facts.

- D1:97: "| > 30% | 40 | Extreme — possible value trap |"

Review: Source-specific scoring rule, not financial advice.

## Q039 — When did the initial portfolio implementation save a holding’s share count?

Immediately when the share count was typed, to the sp_portfolio localStorage key.

Categories: single-session, singlehop, knowledge-facts.

- D2:21: "- Typing a share count **auto-saves to `localStorage`** (key: `sp_portfolio`) and instantly updates the per-row value"

Review: Retrieve autosave timing and storage identity.

## Q040 — What did the score-history chart show before it had two data points?

A placeholder asking the user to refresh a few more times.

Categories: single-session, singlehop.

- D2:21: "- If fewer than 2 data points exist, a friendly "refresh a few more times" placeholder is shown instead"

Review: Retrieve a data-sufficiency empty state.

## Q041 — Which additional sector groups did the expanded-universe report introduce?

International ADRs, ETFs, and Crypto-Adjacent.

Categories: single-session, singlehop.

- D2:21: "- **New sector — International ADRs:** ASML, SAP, NVO, AZN, SHEL, BABA, TSM, SE, MELI, PDD, SONY, TM, HMC, BIDU, JD"
- D2:21: "- **New sector — ETFs:** SPY, QQQ, IWM, DIA, VTI, XLK, XLF, XLV, XLE, ARKK, GLD, SLV, TLT, HYG, VNQ"
- D2:21: "- **New sector — Crypto-Adjacent:** COIN, MSTR, MARA, RIOT, CLSK, HUT, BTBT + others"

Review: Retrieve the explicitly named new groups.

## Q042 — What code path did a custom ticker reuse, and which extra records did the result update?

The existing /api/stock/<ticker> endpoint; it also saved score history and checked alerts.

Categories: single-session, singlehop, knowledge-facts.

- D2:21: "- It calls the existing `/api/stock/<ticker>` endpoint, shows an info banner while loading, then opens the full detail modal — including score breakdown, history chart, and alert setting"
- D2:21: "- The result is also saved to score history and checked against existing alerts"

Review: Retrieve documented reuse and side effects.

## Q043 — Which feature did the agent flag as lacking end-to-end testing?

The Recommendations tab.

Categories: single-session, singlehop, knowledge-facts.

- D2:193: "The shell has been dead this entire session, which means **Feature 8 (Recommendations tab) has never been tested end-to-end**. Before building anything new, the single most valuable thing to do is:"

Review: Record a verification limit, not an unsupported claim that the feature was verified.

## Q044 — What finally stopped the mute-chase alarm when its moving button was caught?

Closing its AudioContext cut the sound, then the overlay and animation timers were torn down.

Categories: single-session, singlehop, knowledge-facts.

- D2:261: "**Click handler:** calls `audioCtx.close()` which immediately destroys the Web Audio graph and cuts all sound mid-note, then calls `_hideMuteChase()` to tear down the UI."
- D2:261: "| `_hideMuteChase()` | Cancels the rAF fade loop, clears the teleport timeout, removes the overlay element from the DOM |"

Review: Retrieve the explicitly reported audio/UI cleanup.

## Q045 — How did the mute-chase countdown escalate its warnings before the deadline?

Gold at ten seconds or less; flashing red at five seconds or less, with a 20-second deadline.

Categories: single-session, singlehop, temporal.

- D2:269: "- **≤ 10s** → turns **gold** (`.warn` class)"
- D2:269: "- **≤ 5s** → turns **red and flashes** rapidly (`.panic` class, `@keyframes countdown-flash`)"
- D2:269: "A `setTimeout(..., 20_000)` fires `_explodePage(audioCtx)` if `_muteChaseMuted` is still `false`. Clicking the button sets that flag first, so a last-millisecond catch still saves you."

Review: Explicit countdown thresholds and duration.

## Q046 — What did Pause Feed stop in the live-feed report?

The feed engine and associated live UI state; the report said it stopped everything cleanly and reset that state.

Categories: single-session, singlehop.

- D3:14: "- Clicking **`⏸ Pause Feed`** stops everything cleanly and resets all UI state"

Review: Retrieve the documented stop action without claiming all unrelated app timers stop.

## Q047 — What final duration did the user-driven rejection-flash revision report?

Exactly one second from flashing in to being fully gone.

Categories: single-session, singlehop, temporal.

- D3:43: "Done — the red screen now flashes in fast and is fully gone within exactly **1 second**."

Review: Final explicit duration, not the earlier 1.1- or 1.4-second variants.

## Q048 — Where did the Random button obtain a ticker if no stock data had loaded?

A hardcoded fallback list of 30 tickers, then the existing custom-ticker lookup.

Categories: single-session, singlehop, knowledge-facts.

- D4:8: "2. **Falls back to a hardcoded list** of 30 well-known tickers if data hasn't loaded yet"
- D4:8: "3. **Fills the ticker input** and calls the existing `lookupCustomTicker()` function, which fetches a full AI score and opens the detail modal — no duplicate code"

Review: Retrieve fallback and code reuse.

## Q049 — What changed about the floating Random button’s direction when a pause ended?

It chose a new angle anywhere around 360° and new velocity components before resuming.

Categories: single-session, singlehop, knowledge-facts.

- D4:38: "Looks perfect. It was a one-line answer really — the old code never touched `_floatVX`/`_floatVY` on resume. Now when the pause ends, it calculates a fresh `angle` (full 360° random) and sets new velocity components before unfreezing, so it drifts off in a completely different direction each time."

Review: Retrieve one explicit motion-state revision.

## Q050 — How did the floating button’s spin behave while paused?

Its angle froze; resuming chose a new spin of 1–3 degrees per frame in either direction.

Categories: single-session, singlehop, knowledge-facts.

- D4:43: "- In **`_floatLoop`**: `_floatAngle += _floatSpin` every frame, applied as `btn.style.transform = rotate(${_floatAngle}deg)`. Spin stops (angle freezes) while paused, resumes right where it left off"
- D4:43: "- In **`_scheduleNextPause`** on resume: picks a new `_floatSpin` between **1–3 deg/frame** with a **random clockwise or counter-clockwise direction**, so each stretch of movement has its own spin personality"

Review: One directly reported pause/resume rule, not a time-duration category.

## Q051 — Why was removing position transitions sensible once the button moved on every animation frame?

Otherwise CSS interpolation would compete with the frame-driven position updates, adding lag or conflicting motion.

Categories: single-session, open-domain.

- D4:31: "- Removed `top`/`left` from the `transition` list — the position is now driven by `requestAnimationFrame` every frame, so CSS transitions on those properties would only fight the animation"

Review: Engineering rationale grounded in the reported competing animation mechanisms.

## Q052 — Which daily-change heuristic did the data-bug diagnosis identify as wrong?

Multiplying a percentage by 100 whenever its absolute value was below one; the report said the input was already a full percentage.

Categories: single-session, singlehop, knowledge-facts.

- D5:7: "**Root cause:** `regularMarketChangePercent` from yfinance is already a **full percentage** (e.g. `0.227` = 0.227%, not a decimal fraction). The code's heuristic — "if `abs(val) < 1`, multiply by 100" — is wrong: a 0.23% move gets multiplied to `22.7%`, while a -3.42% move is correctly left alone."

Review: Scope the claim to this diagnosis rather than asserting a universal current Yahoo API contract.

## Q053 — What happened to existing card nodes and sparklines during FLIP reordering?

The existing DOM nodes were moved rather than destroyed, preserving their sparklines.

Categories: single-session, singlehop, knowledge-facts.

- D5:19: "This means the card DOM nodes are **reused** (never destroyed/recreated on resort), so sparklines stay intact too."

Review: Retrieve a reported rendering property.

## Q054 — How did the rainbow list assign and update a card’s hue?

Hue was index / total × 360; resorting reassigned hues by the new position rather than keeping a permanent ticker color.

Categories: single-session, singlehop, knowledge-facts.

- D5:43: "- A `--card-hue` CSS custom property is set directly on each card element via `card.style.setProperty('--card-hue', hue)`, where `hue = (index / total) * 360`"
- D5:43: "**When you re-sort** (e.g. switch from Score → RSI), cards move to their new positions *and* their hues update to match the new order — so the rainbow always runs top to bottom regardless of sort."

Review: One explicitly documented position-based color rule.

## Q055 — How could the user force fresh external data instead of reusing the five-minute cache?

Ctrl-click or Command-click Refresh to call DELETE /api/cache before fetching again.

Categories: single-session, singlehop, knowledge-facts, temporal.

- D5:63: "Each ticker is cached individually with a Unix timestamp. TTL is **5 minutes**. This is the right granularity because:"
- D5:63: "- **Ctrl+click (or ⌘+click) the Refresh button** → calls `DELETE /api/cache` first, then re-fetches — guaranteed fresh data from yfinance"

Review: Direct retrieval of a cache-expiry override and its duration.

## Q056 — What happened to a News Hint’s point penalty when no news was available?

The game showed an error card but still deducted 75 points.

Categories: single-session, singlehop, knowledge-facts.

- D6:65: "| No news available | Graceful error card shown, 75 pts still deducted |"

Review: Directly reported failure-path behavior.

## Q057 — Why was placing Penny outside the minigame card’s DOM useful?

It let the mascot persist while the card rerendered after clues and guesses.

Categories: single-session, open-domain.

- D6:116: "**Penny** is a cute mascot character who lives in the bottom-right corner of the minigame overlay, outside the card's DOM so she **persists across all re-renders**. She has a speech bubble with a CSS triangle tail pointing down to her face emoji."

Review: Grounded explanation of the mascot lifecycle, not an extra implementation claim.

## Q058 — How do score-history deduplication and the later ticker cache use the same five-minute interval for different purposes?

History suppresses repeated recorded samples; the cache avoids external refetches for fresh ticker data. One does not substitute for the other.

Categories: multi-session, multihop, temporal, knowledge-facts.

- D2:21: "- Every time `loadStocks()` or a custom ticker lookup runs, **each ticker's score is stored with a UTC timestamp** in `localStorage` (key: `sp_score_history`), with a 5-minute dedup guard to prevent noise from rapid refreshes. Up to 60 data points are kept per ticker"
- D5:63: "Each ticker is cached individually with a Unix timestamp. TTL is **5 minutes**. This is the right granularity because:"

Review: D2 provides history deduplication; D5 provides server-side cache freshness.

Session necessity: D2 provides history deduplication; D5 provides server-side cache freshness.

## Q059 — How does the later force-refresh shortcut differ from the original manual-refresh preference?

The user originally wanted display changes not to refresh data; later ordinary Refresh could reuse fresh cache entries, while modifier-click explicitly evicted the cache first.

Categories: multi-session, multihop, preference, knowledge-facts.

- D1:69: "make it so that when i switch formats there's no data refresh. data refresh should only happen when i click the button."
- D5:63: "- A **Refresh** reuses everything still fresh, only re-fetches tickers whose 5 minutes have expired"
- D5:63: "- **Ctrl+click (or ⌘+click) the Refresh button** → calls `DELETE /api/cache` first, then re-fetches — guaranteed fresh data from yfinance"

Review: D1 supplies the user’s refresh preference; D5 supplies ordinary versus forced cache behavior.

Session necessity: D1 supplies the user’s refresh preference; D5 supplies ordinary versus forced cache behavior.

## Q060 — How did stock-card animation change between staggered entry and the later sort animation?

Initial cards entered 55 ms apart; later sorts moved existing cards with FLIP rather than recreating them, while initial loads still staggered.

Categories: multi-session, multihop, temporal, knowledge-facts.

- D3:14: "Every time stocks load or filters change, each card **slides in from the left** with a springy cubic-bezier easing (`cardSlideIn` keyframe). Cards are staggered **55ms apart** — so card #1 enters first, then #2, then #3... creating a satisfying cascade waterfall effect on every data load or sort change."
- D5:25: "- **Initial load** still uses the original staggered `card-enter` slide-in (the `grid.children.length === 0` branch)"
- D5:25: "2. **Last** — reorder the DOM nodes by `appendChild`-ing them in the new sort order (they teleport instantly)"

Review: D3 provides entry timing; D5 provides the different reorder path and retained initial-load behavior.

Session necessity: D3 provides entry timing; D5 provides the different reorder path and retained initial-load behavior.

## Q061 — How did the alert mute button’s motion differ from the later Random button’s motion?

The mute button teleported at randomized intervals, later accelerating toward a deadline; the Random button followed continuous velocity and bounced at viewport edges.

Categories: multi-session, multihop, temporal, knowledge-facts.

- D2:261: "**Teleport loop:** recursive `setTimeout` with a random 600–1200ms delay each time, so the rhythm is unpredictable — you can't learn the pattern."
- D2:269: "The button teleport interval is no longer fixed at 600–1200ms. It now computes a `frac` (0→1 over 20 seconds) and shrinks the interval linearly:"
- D4:31: "- **`_floatLoop()`** — runs every animation frame via `requestAnimationFrame`. Moves the button by its velocity each frame, then checks all 4 viewport edges and **flips the velocity** on contact (classic billiard-ball bounce). Keeps the button fully on-screen at all times."

Review: D2 provides discrete timed teleports; D4 provides frame-driven physics motion.

Session necessity: D2 provides discrete timed teleports; D4 provides frame-driven physics motion.

## Q062 — What shared browser facility produced both the alert alarm and the stock-rejection laugh?

Web Audio synthesis: the alarm layered oscillators and an LFO, while the laugh used six synthesized voices without external sound files.

Categories: multi-session, multihop, knowledge-facts.

- D2:252: "Three layers play simultaneously, scheduled ahead of time on the Web Audio clock so timing is sample-accurate:"
- D2:252: "| **20 Hz square LFO** into the sawtooth gain | Amplitude tremolo at 20 Hz chops the sound on/off fast enough to sound like a rattle or buzz rather than a smooth tone. |"
- D3:37: "**Zero files, zero CDN, zero permissions.** It's entirely synthesized live using the browser's built-in **Web Audio API**."
- D3:37: "Each "laugh" is built from **6 overlapping voices**, all playing simultaneously with staggered offsets so it sounds like a *crowd* not one person:"

Review: D2 supplies alarm synthesis details; D3 supplies the distinct synthesized laugh and no-file property.

Session necessity: D2 supplies alarm synthesis details; D3 supplies the distinct synthesized laugh and no-file property.

## Q063 — Which main-build stock measures later became ordered clues in the ticker game?

Examples include sector, P/E, RSI, 52-week range, EPS growth, profit margin, debt/equity, and the sparkline. The game reused analysis measures as identification clues.

Categories: multi-session, multihop, knowledge-facts.

- D1:11: "| EPS Growth | 20% | Earnings growth YoY |"
- D1:11: "| Profit Margin | 10% | Net profit margin |"
- D1:11: "| Debt/Equity | 10% | Balance sheet strength |"
- D1:11: "- 📏 **52-week range bar** showing where price sits today"
- D1:11: "- 🕯 **Sparkline charts** (90-day, no library — pure Canvas)"
- D1:11: "- 🔽 **Filters**: sector, top N (5/10/15/20), sort by score / daily change / P/E / RSI"
- D6:48: "- Sector → Market Cap → P/E Ratio → RSI → 52-Week Range → EPS Growth → Profit Margin → Debt/Equity → Sparkline chart → Dividend Yield"

Review: D1 establishes analysis measures; D6 establishes their later use as clues, not a separate data-provider claim.

Session necessity: D1 establishes analysis measures; D6 establishes their later use as clues, not a separate data-provider claim.

## Q064 — How did the custom-ticker path support both a user-specified symbol and a later random choice?

The portfolio/features thread exposed an arbitrary-ticker input using /api/stock/<ticker>; the Random button filled that input and called lookupCustomTicker rather than duplicating scoring logic.

Categories: multi-session, multihop, knowledge-facts.

- D2:21: "- Type any ticker symbol (e.g., `ABNB`, `BTC-USD`, `ARM`) and press Enter or click the button"
- D2:21: "- It calls the existing `/api/stock/<ticker>` endpoint, shows an info banner while loading, then opens the full detail modal — including score breakdown, history chart, and alert setting"
- D4:8: "3. **Fills the ticker input** and calls the existing `lookupCustomTicker()` function, which fetches a full AI score and opens the detail modal — no duplicate code"

Review: D2 supplies the arbitrary-ticker feature; D4 supplies the Random button’s reuse of it.

Session necessity: D2 supplies the arbitrary-ticker feature; D4 supplies the Random button’s reuse of it.

## Q065 — How did card-color assignment differ from the earlier light/dark theme implementation?

The theme replaced shared UI color tokens and persisted a user choice; the later rainbow feature assigned hues by each card’s current sorted position and adapted them for light mode.

Categories: multi-session, multihop, knowledge-facts.

- D1:81: "- Added a `body.light { }` block that overrides just the 11 colour tokens — every other rule already uses `var(--*)` so the entire UI flips automatically"
- D1:81: "- `toggleTheme()` — toggles `body.light`, flips the button icon between `☾` (dark) and `☀` (light), saves the choice to `localStorage`"
- D5:43: "- A `--card-hue` CSS custom property is set directly on each card element via `card.style.setProperty('--card-hue', hue)`, where `hue = (index / total) * 360`"
- D5:43: "Light mode is also handled with adjusted saturation/lightness values that work on the white background."

Review: D1 supplies global token-based theme persistence; D5 supplies per-card positional hues and light-mode adaptation.

Session necessity: D1 supplies global token-based theme persistence; D5 supplies per-card positional hues and light-mode adaptation.
