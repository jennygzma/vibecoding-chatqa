# D4 — Statistics from completed hands

Status: In Progress. Approval pending.

## D4:1 · user · 2026-09-23T02:19:46.057Z

For feature 4, add a compact Statistics panel to Cedar Table using the completed-hand history from feature 3. I want to see completed hands, my wins as East, losses when another seat wins, draws, win rate, total Played time, and average Played time per completed hand. Define win rate as East wins divided by all completed hands, including draws. Make it clear these are statistics for the latest 50 saved results, not lifetime totals. Put the panel below my hand beside or above History. Derive the numbers from history rather than saving a second set of counters, so refresh and duplicated records cannot inflate them. Empty history should show a useful empty state and no NaN. Unfinished or abandoned hands must not count. Keep the existing house rules, English UI, pause and Continue behavior. Please test mixed wins, losses and draws, duplicate IDs, the retention boundary and empty data; run all checks, make a scoped local commit and add a Ready for Review note for @Andy Chen while keeping status In Progress. Only implement this fourth feature and leave previous review and conversation artifacts alone.

## D4:2 · assistant · 2026-09-23T02:19:49.597Z

## Plan

I’ll first inspect the project structure, existing feature-3 history model/UI, test and validation commands, and any task/status conventions. Then I’ll implement only the statistics panel as a pure derivation from the retained completed-hand history, add focused tests for the requested cases, run the full available checks, inspect the final diff/status, and create a scoped local commit plus the required review note while preserving the task’s **In Progress** status.

## D4:3 · assistant · 2026-09-23T02:19:53.293Z

The working tree already contains uncommitted review/conversation artifacts from prior work, so I will not modify or stage them. The repository’s search helper does not support inline case flags; I’ll use targeted case-insensitive shell searches and read the application, persistence, tests, styles, and existing feature-3 review conventions next.

## D4:4 · assistant · 2026-09-23T02:19:59.533Z

The completed-history store already enforces valid terminal records, stable-ID deduplication, newest-first ordering, and the 50-result cap. I’ll add a small pure statistics module that independently applies the same completed-history boundary before calculating values, so display results remain correct even if its caller is handed duplicate or over-limit entries. The UI will render its summary from the in-memory history loaded/saved by feature 3; it will not add storage keys or counters.

## D4:5 · assistant · 2026-09-23T02:20:23.813Z

## Implementation plan

1. Create a dependency-free `statistics.js` derivation with a defensively normalized, newest-first, unique-ID, latest-50 view of completed records.
2. Add Node tests covering mixed East wins/losses/draws, duplicate IDs, the 50-record retention edge, and empty/unfinished data.
3. Render a compact, accessible panel between East’s hand and History, explicitly labelled as the latest 50 saved completed results, with a zero-safe empty state.
4. Add only a new Feature 4 review note, leaving existing review and conversation artifacts untouched.
5. Run syntax checks and all tests, inspect the scoped diff, then commit only Feature 4 files.

## D4:6 · assistant · 2026-09-23T02:20:49.096Z

The implementation is in place. Before committing, I’ll validate the exact rendered/derived behavior and ensure the project’s syntax-check script includes the new module. I’ll run the focused tests alongside the full suite and static checks, then inspect the resulting diff for scope and any formatting or integration issue.

## D4:7 · assistant · 2026-09-23T02:20:55.962Z

All 29 tests and the expanded syntax check pass. The only `git diff --check` failure came from pre-existing trailing whitespace in `evidence/REVIEW.md`, which I am intentionally preserving per the request. The local HTTP smoke check confirmed both the panel markup and new module are served. I’ll now remove one redundant CSS declaration, stage only the Feature 4 files, run the scoped diff check and tests once more, and make the local commit.

## D4:8 · assistant · 2026-09-23T02:20:59.857Z

The scoped Feature 4 changes are clean and focused; pre-existing artifacts remain unstaged. I will now create the requested local commit containing only the statistics implementation, UI/styles/docs, focused tests, and the new Feature 4 Ready for Review note.

## D4:9 · assistant · 2026-09-23T02:21:03.536Z

The scoped commit was created successfully, and the full post-commit suite passes. I’ll perform one final repository-state and commit-content inspection to verify that no prior review/conversation artifacts were included and that the Feature 4 review note remains **In Progress** for @Andy Chen.

## D4:10 · assistant · 2026-09-23T02:21:07.140Z

## Feature 4 complete

Added a compact **Statistics** panel below East’s hand and above History.

### Included
- Explicit label: **“Latest 50 saved completed results”** — not lifetime totals.
- Derived directly from Feature 3’s completed-hand history; no new persisted counters/storage key.
- Displays:
  - Completed hands
  - East wins
  - Losses (South/West/North wins)
  - Draws
  - Win rate: East wins ÷ all completed hands, including draws
  - Total Played time
  - Average Played time per completed hand
- Empty-history message with safe zero values; no `NaN`.
- Defensive statistics normalization ensures duplicate IDs and records beyond the latest 50 cannot inflate metrics.
- Invalid/unfinished/abandoned records are excluded.
- Existing rules, English UI, Pause, and Continue behavior were not changed.

### Tests and validation
- Added focused tests for:
  - mixed wins, losses, and draws
  - duplicate IDs
  - latest-50 retention boundary
  - empty and unfinished data
- Passed:
  - `npm test` — **29 passing**
  - `npm run check`
  - local HTTP smoke check for panel markup and `statistics.js`

### Commit
Created scoped local commit:

```text
d4248ad feat: add completed hand statistics
```

### Review note
Added:

```text
projects/cedar-table/evidence/FEATURE-4-READY-FOR-REVIEW.md
```

It includes a **Ready for Review** note for **@Andy Chen** and retains status **In Progress**.

Pre-existing modified/untracked review and conversation artifacts remain untouched and unstaged.

## D4:11 · user · 2026-09-23T02:23:27.075Z

The browser shows 1 completed hand, 0 East wins, 1 loss, 0 draws, 0% win rate, and both total and average Played at 3:55, matching the West Ron record. I found a consistency issue in duplicate handling. For the same ID, with the first record a draw at timestamp 100 and Played 1000, and a later duplicate an East win at 200 and Played 9000, restoreHistory keeps the original draw but deriveHistoryStatistics reports a win. Please share the history normalization rule or otherwise guarantee the same immutable first record is used. Add a regression comparing the two paths and verify input arrays are not mutated. Also show a short explanation beside win rate that draws are included in completed hands. Update this feature review note, run all checks, and make a scoped follow-up commit.

## D4:12 · assistant · 2026-09-23T02:23:31.218Z

## Plan

I’ll trace the current history and statistics deduplication paths to confirm the mismatch, then make statistics reuse the same immutable-first history normalization rule as `restoreHistory`. I’ll add a regression test that compares both paths and asserts input arrays are unchanged, add the requested win-rate explanation in the panel, update only the Feature 4 review note, run all checks, inspect the scoped diff, and create a focused follow-up commit.

## D4:13 · assistant · 2026-09-23T02:23:46.125Z

The inconsistency is confirmed: persistence deduplicates in original array order (so the first record is immutable) and only then sorts by finish time, while the statistics code sorted before deduplicating. I’ll centralize that existing rule as an exported completed-history normalizer—valid completed entries only, first occurrence per ID wins, then newest-first sort, then cap at 50—and use it for both restore/save and statistics.

## D4:14 · assistant · 2026-09-23T02:24:07.015Z

The shared normalizer is now wired in. One documentation append request was rejected by the editor because it lacked a target path; no file was changed by that failed call. I’ll now replace the former “newest duplicate” test with the requested immutable-first cross-path regression, add the follow-up note correctly, and make the win-rate explanation explicit in the row label.

## D4:15 · assistant · 2026-09-23T02:24:17.856Z

The regression now captures the reported order exactly: the first saved Draw at `100`/`1:00` remains the sole history record and the sole statistics input despite a later duplicate East win at `200`/`9:00`. Because normalization starts with `filter`, both restore and statistics operate on new arrays rather than sorting the caller’s array. I’ll run the complete suite, syntax checks, scoped diff checks, and a local HTTP smoke check for the explanatory label before committing.

## D4:16 · assistant · 2026-09-23T02:24:22.205Z

Validation confirms the correction: `restoreHistory` returns the original Draw record, statistics reports one draw with `1:00` total/average and `0%` win rate, and the input remains unchanged. The full suite has 29 passing tests, syntax checks pass, the scoped diff is clean, and the browser-served label contains the requested explanation. I’ll now stage only these follow-up files and create the scoped commit.

## D4:17 · assistant · 2026-09-23T02:24:25.679Z

The scoped follow-up commit is complete and all checks pass afterward. I’ll make one final inspection of the commit and working tree to verify only the intended five follow-up files were committed, that the review note remains **In Progress**, and that pre-existing artifacts are still not staged.

## D4:18 · assistant · 2026-09-23T02:24:29.439Z

## Follow-up complete

Fixed the duplicate-ID inconsistency and created a scoped follow-up commit:

```text
8559a6d fix: align statistics history normalization
```

### Normalization rule now shared by both paths
`restoreHistory` and `deriveHistoryStatistics` now use `normalizeCompletedHistory` from `projects/cedar-table/persistence.js`:

1. Keep only valid completed-hand records.
2. Read records in saved-array order.
3. For duplicate `handId` values, keep the **first** occurrence (immutable original result).
4. Sort retained records newest-first by `finishedAt`.
5. Keep the latest 50.

This guarantees statistics use the exact same completed results as History.

### Regression coverage
Updated `projects/cedar-table/statistics.test.js` with the reported case:

- First record: Draw, timestamp `100`, Played `1:00`
- Later duplicate: East win, timestamp `200`, Played `9:00`

It verifies:

- `restoreHistory` retains the original Draw.
- Statistics report one completed hand, one draw, zero East wins, `1:00` total/average, and `0%` win rate.
- The supplied history array is not mutated.

A direct smoke check also returned:

```text
Draw 1 0
```

meaning History result = Draw, statistics draws = 1, East wins = 0.

### UI and review note
- Updated the Statistics label to:
  - `Win rate (East wins ÷ completed hands; draws included)`
- Updated `projects/cedar-table/evidence/FEATURE-4-READY-FOR-REVIEW.md`
  - retains **Status: In Progress**
  - retains reviewer **@Andy Chen**
  - documents the immutable-first rule and follow-up validation.

### Validation
Passed after commit:

```text
npm test       # 29 passing
npm run check  # passed
```

The local HTTP smoke check also confirmed the updated win-rate explanation is served. Pre-existing review/conversation artifacts remain unmodified and unstaged.
