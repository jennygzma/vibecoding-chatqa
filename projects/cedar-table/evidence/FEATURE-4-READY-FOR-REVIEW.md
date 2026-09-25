# Cedar Table — Feature 4 Ready for Review

> Historical feature checkpoint. Counts and validation reflect this checkpoint; see [the consolidated review](FEATURES-1-10-READY-FOR-REVIEW.md) for the current ten-session package.

**Status: In Progress**
**Reviewer: @Andy Chen**
**Approval: Pending**

## Ready for Review

Feature 4 adds a compact **Statistics** panel above History, below East’s hand. It derives every value from the completed-hand history already retained by Feature 3; it does not save a second counter set.

- The panel explicitly covers the **latest 50 saved completed results**, not lifetime totals.
- It shows completed hands, East wins, losses when South/West/North wins, draws, East-win rate, total Played time, and average Played time per completed hand.
- Win rate is East wins divided by every completed hand, including draws.
- Empty history has an explanatory state and zero-safe values; unfinished or abandoned hands are excluded.
- Duplicate IDs use the same immutable-first normalization as History: valid entries are read in saved-array order, the first occurrence of an ID wins, then retained records are sorted newest first and capped at 50. Statistics consume that shared normalized result.
- Existing house rules, English UI, Pause, and Continue behavior are unchanged.

## Tests and validation

Run from `projects/cedar-table`:

```sh
npm test
npm run check
```

The focused statistics tests cover mixed wins/losses/draws, duplicate IDs, the 50-record retention boundary, and empty/unfinished data.

Ready for Review — @Andy Chen: Feature 4 is ready for local review. Status: **In Progress**; approval pending.

## Follow-up

- Corrected duplicate-ID consistency: History restoration and Statistics now share `normalizeCompletedHistory`, so both retain the first saved record for an ID before sorting by finish time.
- The statistics regression compares `restoreHistory` and `deriveHistoryStatistics` for a first Draw (timestamp 100, Played 1:00) followed by a duplicate East win (timestamp 200, Played 9:00); both use the immutable Draw record.
- The regression also verifies neither path mutates the supplied history array.
- The Win rate label now states that it is East wins divided by completed hands and that draws are included.


Ready for Review — @Andy Chen: Feature 4 is ready at `8559a6d` (following `d4248ad`). Status remains **In Progress**; approval pending.

- All 29 tests and syntax checks passed after the normalization follow-up.
- The browser shows 1 completed hand, 0 East wins, 1 loss, 0 draws, 0% win rate, total Played 3:55 and average Played 3:55.
- The panel explains that draws are included in the win-rate denominator.
- The original 1000/9000 ms duplicate example was checked separately: history and statistics both retain the original draw and 1000 ms. The committed regression uses 1/9 minute durations; these are separate fixtures.
- [Statistics screenshot](feature-4/statistics.jpg) and [browser observations](feature-4/browser-checks.json).
- D4 is an independent original conversation; the combined export has 4 sessions, 40 questions and 61 verified exact quotations.
