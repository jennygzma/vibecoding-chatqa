# D5 — On-demand standard-hand practice hints

Status: In Progress. Approval pending.

## D5:1 · user · 2026-09-23T02:31:37.593Z

For feature 5, add on-demand practice hints next to East's hand. I want to click Analyze hand during my discard turn and see which discards would leave me one tile away from a standard winning hand, with the possible winning tile names for each discard. Keep the four-meld-and-a-pair rules and account for my exposed melds, including kans; do not introduce seven pairs, thirteen orphans, scoring, or automatic play.

Use only my own tiles and public information. Do not inspect opponents' concealed tiles or the remaining wall to choose hints. Exclude a candidate when all four copies are already visible in my hand or public melds/discards, counting each physical tile once. Explain that these are structural waits with unseen copies, not guaranteed draws or probabilities. Collapse hints on request and clear stale results when I discard, the turn changes, a claim happens, the hand is paused or awaiting Continue, or the hand ends/restarts. A hand with no qualifying discard needs a clear empty message. Analyzing must not alter the hand, advance play, or create history/statistics entries.

Keep the English UI and features 1-4 working. Add meaningful tests for known waits, exposed melds/kan, exhausted copies, duplicate discards, non-mutation, and independence from hidden information. Run the full tests and make a scoped local commit. Leave the task In Progress, with a Ready for Review note for @Andy Chen and the evidence. Only implement feature 5 in this conversation.

## D5:2 · assistant · 2026-09-23T02:31:41.222Z

## Plan

I’ll first inspect the project structure, existing feature implementation, test setup, and task-tracking conventions. Then I’ll trace the turn/hand state and UI around East’s hand, implement only the on-demand structural-wait analyzer and its invalidation behavior, add focused tests, run the full suite, review the diff, create a scoped local commit, and update the task status to **In Progress** with a **Ready for Review** note for @Andy Chen.

## D5:3 · assistant · 2026-09-23T02:31:44.629Z

The working tree already contains unrelated evidence/data changes from earlier features; I will not stage or modify them. The game is dependency-free Node/browser JavaScript, so I’ll keep the analyzer as pure rules logic, with UI state kept out of persisted gameplay state to ensure analysis has no game/history side effects. Next I’m reading the current modules and tests in full to align the exact state lifecycle and rendering conventions.

## D5:4 · assistant · 2026-09-23T02:31:54.005Z

## Implementation approach

- Add a pure `analyzeDiscardWaits` rule helper that:
  - evaluates only East’s concealed hand plus East’s exposed-meld count;
  - builds visibility solely from East’s hand and all exposed melds/discards;
  - enumerates standard four-meld-and-a-pair completions, treating every kan as one meld;
  - suppresses exhausted winning tile types and collapses repeated identical discard tile types;
  - never mutates input state.
- Add focused rules tests for normal waits, exposed melds/kan, exhausted tiles, duplicate candidates, immutability, and different hidden hands/walls producing identical results.
- Add the English on-demand panel beside East’s heading, with collapse and all required lifecycle clearing; keep analysis UI-only so it is neither saved nor recorded in history/statistics.
- Document Feature 5 review evidence in a new, scoped evidence file, leaving existing modified evidence untouched.

## D5:5 · assistant · 2026-09-23T02:32:12.081Z

I confirmed that a wait after an exposed kan is correctly modeled by the existing winning checker as one completed meld: it uses `melds[0].length`, not exposed tile count. I’ll now apply the pure analyzer, UI controls/clearing, documentation, and tests in separate scoped files.

## D5:6 · assistant · 2026-09-23T02:32:27.981Z

The initial rules tests establish the required algorithm behavior, including that candidate deduplication is by tile type while visibility counts every physical copy. I’m now wiring the panel as ephemeral application state and ensuring every gameplay/lifecycle path clears it before rendering the changed state.

## D5:7 · assistant · 2026-09-23T02:33:03.104Z

The UI now has a disabled-outside-turn Analyze control, result rendering, collapse, empty state, and an explicit structural-wait disclaimer. One final lifecycle pass is needed for scheduled computer/claim transitions and Continue before validating the tests and checking the exact analyzer output.

## D5:8 · assistant · 2026-09-23T02:33:11.494Z

## Validation plan

I’ll run the complete test suite and syntax check, inspect the feature-only diff, and use the test failures (if any) to correct the deliberately small wait fixtures. I’ll also verify that only Feature 5 files are staged later, preserving the pre-existing unrelated working-tree changes.

## D5:9 · assistant · 2026-09-23T02:33:17.604Z

The full suite exposed only a test import omission (`tileKey`), while the JavaScript syntax check already passes. I’ll correct that test, add the explicit no-qualifying-discard regression required for the panel’s empty message, then rerun all checks. The repository-wide whitespace check reports only pre-existing whitespace in the unrelated modified `evidence/REVIEW.md`; I will run a scoped diff check for Feature 5 files instead.

## D5:10 · assistant · 2026-09-23T02:33:28.139Z

The empty-state test uses a seven-pairs-shaped hand specifically because special hands remain unsupported: no discard may qualify under the standard-only evaluator. I’ll now run the complete automated validation and a direct analyzer inspection, then review the staged-only diff before committing.

## D5:11 · assistant · 2026-09-23T02:33:34.908Z

The kan test correctly found an additional legitimate sequence-extension wait (`4 Bamboo`), so I’ll update the expected standard-only result rather than suppress valid hints. I’ll also make the hidden-information test explicit by changing arbitrary opponent/wall data between identical analyzer calls and confirming unchanged output.

## D5:12 · assistant · 2026-09-23T02:33:43.118Z

All expected waits are now asserted, including the valid two-sided sequence wait in the exposed-kan fixture. I’ll perform the final full validation, inspect exactly what will be committed, stage only the six Feature 5 files, create the scoped local commit, and verify the commit content and remaining unrelated changes.

## D5:13 · assistant · 2026-09-23T02:33:46.134Z

The code and all 33 tests pass; the only failing final chained command was the scoped documentation whitespace check because Markdown’s two-space line breaks were used. I’ll remove those nonessential trailing spaces, rerun the full validation and scoped diff check, then commit only Feature 5.

## D5:14 · assistant · 2026-09-23T02:33:52.194Z

Validation is clean: **33/33 tests pass**, syntax checks pass, and the Feature 5-only diff is whitespace-clean. I’ll now stage exactly the Feature 5 implementation, tests, UI styling/markup, and review note—excluding all pre-existing modified/untracked files—then create and verify the local commit.

## D5:15 · assistant · 2026-09-23T02:33:54.548Z

The scoped commit was created as `73fa0ba`. Its six files are exactly the Feature 5 files; the remaining working-tree changes are the pre-existing evidence/data items and were not included. I’ll do one final post-commit verification of the commit boundaries and test status.

## D5:16 · assistant · 2026-09-23T02:33:58.679Z

## Feature 5 complete — Ready for Review

Implemented and committed on-demand structural-wait practice hints for East.

### Delivered
- Added **Analyze hand** beside East’s hand, enabled only during East’s active discard turn.
- Shows distinct discard candidates and possible winning tile names for standard four-meld-and-a-pair waits.
- Counts exposed melds correctly, including each **kan** as one meld.
- Uses only East’s concealed hand plus public exposed melds/discards.
- Excludes waits whose tile type has all four physical copies visible.
- Explains that results are **structural waits with unseen copies**, not guaranteed draws or probabilities.
- Includes a clear empty result message.
- Supports **Collapse hints**.
- Clears hints on:
  - discard/action,
  - claim/turn resolution,
  - pause,
  - saved-hand Continue state and Continue action,
  - visibility pause,
  - hand end/restart/restore.
- Keeps analysis ephemeral: it does not mutate game state, advance play, save analysis, or affect history/statistics.

### Tests
Added focused tests for:
- Known standard waits.
- Exposed meld and kan handling.
- Exhausted visible copies.
- Duplicate discard candidates.
- Empty/no-qualifying-discard results.
- Non-mutation.
- Independence from opponent concealed tiles and wall contents.

Validation completed successfully:
- `npm test` — **33 passing**
- `npm run check` — **passing**
- Scoped diff whitespace checks — **passing**

### Commit
- `73fa0ba feat: add on-demand hand practice hints`

### Review note
Created: `projects/cedar-table/evidence/FEATURE-5-READY-FOR-REVIEW.md`

**Status: In Progress**
**Ready for Review: @Andy Chen**

Note: pre-existing unrelated evidence/data modifications remain uncommitted and were intentionally excluded from the Feature 5 commit.

## D5:17 · user · 2026-09-23T02:35:55.765Z

I tried the page: Analyze hand left East's 14 tiles, the 83-tile wall, and the zero history/statistics totals unchanged. The empty message was clear. Pause removed the hints and disabled Analyze; Resume did not restore stale hints, and Collapse also worked.

I found a gap in the exhausted-copy test: it supplies 15 concealed tiles and five copies of 1 Bamboo across the hand and discards, so an empty answer can pass just because the hand length is invalid. Please replace it with legal 14-tile fixtures: first demonstrate a real wait, then expose its remaining copies and prove only that exhausted wait disappears. Test duplicate discard deduplication with a nonempty result as well.

Also, my direct analyzer check repeated the same public tile id b1b three times. With one occurrence, discarding 1 Bamboo gave waits [1 Bamboo, 4 Bamboo]; with three references to that same physical tile, it incorrectly dropped 1 Bamboo. The game normally keeps zones disjoint, but the requested physical-copy rule should count an id once. Please deduplicate visible tiles by physical id, with a sensible fallback for id-less fixtures, and test repeated references versus genuinely distinct copies. Keep the standard kan/two-sided wait and non-mutation tests, rerun the full checks, and commit this feature-5 correction. Keep status In Progress for review.

## D5:18 · assistant · 2026-09-23T02:35:58.773Z

## Plan

I’ll inspect the committed Feature 5 analyzer and its current tests, then correct visibility counting so a physical tile ID contributes at most once while id-less test fixtures retain sensible per-object counting. I’ll replace the invalid exhausted/duplicate test with legal 14-tile fixtures that first prove a real wait and then exhaust only that wait, add repeated-ID versus distinct-copy coverage, retain the kan and non-mutation coverage, run the full checks, update the Feature 5 review evidence while keeping **In Progress**, and create a scoped correction commit.

## D5:19 · assistant · 2026-09-23T02:36:21.686Z

The baseline is clean and the existing unrelated evidence/data working-tree changes remain unstaged. The correction will deduplicate only tiles carrying a usable physical `id`; id-less fixtures will continue to count each occurrence. I’ll use legal 14-tile hands: one fixture establishes the 1 Bamboo/4 Bamboo wait, then adds three distinct public 1 Bamboo copies to remove only the exhausted 1 Bamboo wait; a separate 14-tile fixture verifies a duplicated discard type yields one nonempty candidate.

## D5:20 · assistant · 2026-09-23T02:36:33.537Z

The correction is implemented with the intended semantics: repeated `id: "b1b"` references count once, while three separate IDs count as three physical copies; tiles without IDs remain individually countable for concise fixtures. The replacement exhausted-copy and duplicate-discard tests are both legal 14-tile, nonempty scenarios. I’ll run the full suite and syntax checks now, then review the exact scoped diff.

## D5:21 · assistant · 2026-09-23T02:36:36.836Z

The correction logic and all requested regression categories pass except the duplicate-discard fixture’s overly narrow expected wait list: discarding Red legitimately has both East and Red waits. I’ll preserve the intended assertion—exactly one Red discard candidate with a nonempty wait list—while accepting both structurally valid waits, then rerun the full checks.

## D5:22 · assistant · 2026-09-23T02:36:41.102Z

The duplicate candidate test now verifies the key requirement precisely: three Red tiles yield one Red discard candidate, with a nonempty—and fully enumerated—standard wait list. I’ll complete full validation, review the scoped diff, then stage only this correction’s three files and create the local commit.

## D5:23 · assistant · 2026-09-23T02:36:43.840Z

Full validation is clean: **35/35 tests pass**, syntax checks pass, and the three-file correction diff is whitespace-clean. The scoped change preserves the earlier standard-kan/two-sided and non-mutation tests. I’ll stage only `rules.js`, `rules.test.js`, and the Feature 5 review note, create the requested local correction commit, then verify its boundaries and the final test result.

## D5:24 · assistant · 2026-09-23T02:36:47.520Z

## Feature 5 correction complete — Ready for Review

Corrected the exhausted-copy visibility logic and committed the fix.

### Changes
- Public visible tiles are now deduplicated by physical `tile.id` before copy counts are calculated.
  - Repeated references to the same ID count once.
  - Distinct IDs count as distinct physical copies.
  - Id-less fixture tiles continue to count per occurrence for practical unit-test setup.

- Replaced the invalid 15-concealed-tile exhausted-copy test with legal 14-tile fixtures:
  - Baseline: discarding 1 Bamboo waits on **1 Bamboo** and **4 Bamboo**.
  - After exposing the other three distinct 1 Bamboo copies: only **4 Bamboo** remains.

- Added a nonempty duplicate-discard test:
  - Three Red tiles still yield exactly one Red discard candidate, with valid waits.

- Added regression coverage for:
  - Three references to the same `b1b` physical tile preserving the 1 Bamboo wait.
  - Three distinct public 1 Bamboo IDs exhausting only the 1 Bamboo wait.
  - Existing exposed-kan/two-sided wait and non-mutation tests remain in place.

### Validation
- `npm test` — **35 passing**
- `npm run check` — **passing**
- Scoped diff whitespace check — **passing**

### Commit
- `c03a3e3 fix: count unique physical tiles in practice hints`

Updated review evidence:
- `projects/cedar-table/evidence/FEATURE-5-READY-FOR-REVIEW.md`

**Status remains: In Progress**
**Ready for Review: @Andy Chen**

Pre-existing unrelated evidence/data working-tree changes remain uncommitted and were not included in this correction commit.

## D5:25 · user · 2026-09-23T02:41:19.281Z

The 35 tests and the localhost browser checks pass. I then returned to the original http://127.0.0.1:4340/ page with the saved finished hand and hit a real upgrade issue: it stays at “Setting the table…” even in a new tab. The browser error is: SyntaxError: The requested module './rules.js' does not provide an export named 'analyzeDiscardWaits', at /app.js. The old origin has a cached pre-feature-5 rules module while loading the new app entry.

Please fix this within feature 5 so a normal navigation after an update loads a consistent module graph. Use a small, consistent asset revision for the entry module and its transitive local imports (and the stylesheet if appropriate); avoid duplicate differently versioned module instances. Keep Node tests working, retain saved hand/history keys, and document how to update that revision. Check the full suite and commit the focused correction, with the review status still In Progress. I will recheck the original saved hand in the browser.

## D5:26 · assistant · 2026-09-23T02:41:23.692Z

## Plan

I’ll inspect the HTML entrypoint and complete local module import graph to introduce one consistent browser asset revision without changing Node import specifiers or local-storage keys. The revision will be applied uniformly from the entry module through its transitive browser imports, avoiding mixed cached/new module graphs and duplicate version variants. I’ll document the update rule, run the full suite and syntax checks, then create a scoped Feature 5 correction commit while leaving review status **In Progress**.

## D5:27 · assistant · 2026-09-23T02:41:46.487Z

The browser graph has one HTML entry and five local modules. I’ll use the single revision `v=5` on the stylesheet, module entry, and every browser-facing local import edge: `app → game/clock/persistence/rules/statistics`, `game → rules`, `persistence → game/rules`, and `statistics → persistence`. This makes every module in the loaded application graph resolve to the same revision URL, while Node tests can keep their unversioned direct test imports. I’ll add a concise README deployment rule that the single revision must be bumped everywhere together for future browser updates.

## D5:28 · assistant · 2026-09-23T02:42:08.386Z

The revision is now uniform across every browser import edge, including the shared dependencies reached through multiple paths (`game`, `persistence`, and `rules`), so the browser will instantiate each module at a single `?v=5` URL. Node’s direct test imports remain unversioned; its imported dependencies resolve normally with the revision query. I’ll now verify that no local browser import was missed or given a different revision, validate the full suite, inspect the scoped diff, and confirm the saved storage keys are unchanged.

## D5:29 · assistant · 2026-09-23T02:42:12.699Z

Validation confirms exactly one revision value (`?v=5`) throughout the browser asset graph, including every transitive import, and confirms the persisted keys remain `cedar-table.hand.v1` and `cedar-table.history.v1`. The complete suite still passes (**35/35**) and syntax checks are clean. I’ll commit only the seven focused revision/documentation/review files, then verify the commit boundary and that unrelated working-tree evidence remains untouched.

## D5:30 · assistant · 2026-09-23T02:42:15.984Z

## Fixed browser module-cache upgrade issue

Created focused Feature 5 correction commit:

- `1978afa fix: version browser practice hint module graph`

### What changed
- Applied one shared browser asset revision: `?v=5`
  - `index.html` stylesheet and module entry
  - `app.js` imports
  - Transitive local imports in `game.js`, `persistence.js`, and `statistics.js`
- This ensures normal navigation loads a consistent graph, rather than a new `app.js` importing an old cached `rules.js`.
- Shared dependencies now use the same URL revision, so the browser does not create duplicate, differently-versioned module instances.
- Kept Node test entry imports unchanged; Node continues to resolve and execute the graph successfully.
- Confirmed saved-hand and history keys remain unchanged:
  - `cedar-table.hand.v1`
  - `cedar-table.history.v1`
- Documented the revision update procedure in:
  - `projects/cedar-table/README.md`
- Updated Feature 5 review evidence while retaining **Status: In Progress**.

### Validation
- `npm test` — **35 passing**
- `npm run check` — **passing**
- Verified the entire browser graph uses exactly one revision value: `?v=5`.
- Verified focused diff is whitespace-clean.

Only the seven focused files were included in the commit. Pre-existing unrelated evidence/data changes remain uncommitted.
