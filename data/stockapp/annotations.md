# StockApp annotations

## Q001 — What did I want the first StockApp to do, and where should it run?

Recommend stocks to buy in a local web app.

Categories: single-session, singlehop, preference.

- D1:1: "Build a local web app that gives me the best stocks to buy."

Review: Directly retrieves the user’s requested purpose and local delivery; it does not endorse the recommendations.

## Q002 — In the main-build conversation, what display changes did I want to make without refreshing stock data?

Switch display formats; fetch fresh data only when I click the refresh button.

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

## Q009 — What deadline did I request for the mute-alarm chase?

Twenty seconds before the page “explodes.”

Categories: single-session, singlehop, temporal, preference.

- D2:262: "make it so that if the user doesn't get it in 20 seconds the page "explodes""

Review: One explicit user timing preference; describes the requested playful page effect, not a system failure.

## Q010 — Why is a five-minute guard useful when users repeatedly refresh the score history?

It prevents rapid refreshes from filling the history with near-duplicate samples.

Categories: single-session, open-domain.

- D2:21: "with a 5-minute dedup guard to prevent noise from rapid refreshes. Up to 60 data points are kept per ticker"

Review: One-sentence explanation of the documented deduplication guard; no unsupported promise about statistical accuracy.

## Q011 — What stock-click rejection probability did I ask for?

A 50% chance of rejecting a click.

Categories: single-session, singlehop, preference.

- D3:25: "Make the stock app have a 50% chance of rejecting your attempt to click on a stock"

Review: Direct numerical preference in the visual-effects conversation.

## Q012 — How long did I ultimately want the red denial screen to last in the visuals conversation?

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

## Q022 — How did I correct the first minigame concept?

I wanted players to identify a ticker from stock numbers, rather than predict whether its price would go up or down.

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

## Q027 — What place did I want the ticker minigame to have within StockApp?

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

## Q032 — How do the stock-click rejection request and the final minigame wrong-guess report differ in allowing another attempt?

A stock click may be rejected with 50% probability; a wrong ticker guess keeps the round open so the player can keep guessing.

Categories: multi-session, multihop.

- D3:25: "Make the stock app have a 50% chance of rejecting your attempt to click on a stock"
- D6:96: "**Wrong guess** → `answered` stays `false`"
- D6:96: "player can keep guessing"

Review: Compares failure handling in two distinct interactions without inventing a shared probability for minigame guesses.

Session necessity: D3 defines rejected dashboard clicks; D6 defines continued guessing after an incorrect ticker.

## Q033 — What distinct portfolio and minigame additions did I request without replacing the stock-analysis purpose?

A holdings view with total value, daily P&L and weighted AI score, plus a secondary ticker-guessing game.

Categories: multi-session, multihop, preference.

- D2:1: "Show a "My Portfolio" view with total value, daily P\&L, and weighted average AI score across their holdings."
- D6:30: "give u some numbers about the stock and u have to guess the ticker"
- D6:131: "verify that the ticker game is a sidebar thing and not the main focus."

Review: Integrates explicit requirements from the portfolio and game conversations, with the later priority statement limiting the game’s role.

Session necessity: D2 supplies the portfolio metrics; D6 supplies the guessing mechanic and secondary placement.
