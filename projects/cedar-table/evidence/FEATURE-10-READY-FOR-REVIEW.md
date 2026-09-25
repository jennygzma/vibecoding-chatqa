# Cedar Table — Feature 10 Ready for Review

**Status: In Progress**
**Reviewer: @Andy Chen**
**Approval: Pending**

## Ready for Review

Feature 10 adds a local native **Export history CSV** action in History.

- The button directly downloads `cedar-table-history.csv`; there is no dialog, external service, or saved export preference.
- Its English help states that it exports all retained saved results regardless of the current History result filter. It remains enabled when a filter has no matches and is disabled only when no valid retained result exists.
- Export uses the existing canonical completed-history normalization: valid records only, first valid duplicate ID retained before newest-first sorting and the 50-record cap. It neither reads older post-cap records nor changes the filter or statistics.
- CSV uses UTF-8 Blob content and CRLF rows with the exact columns `hand_id,result,winner,finished_at_utc,finished_at_estimated,played_ms,played`. Winners are East, South, West, North, or Draw; timestamps are UTC ISO values; migrated estimated times are retained; Played stays active-duration based.
- CSV quoting covers commas, quotes, and line breaks. Formula-leading hand IDs and result text are protected even after leading whitespace. A retained timestamp outside JavaScript Date range produces a blank timestamp cell instead of failing export.
- The browser creates a temporary object URL for the direct download and always revokes it. Preparation failures show an inline export message while preserving existing History storage notices.
- Export is a pure read of History: it does not write local storage, advance play, reset the clock, clear hints, cancel an East tile selection, or alter History filtering/statistics. It is available before Continue, while paused, during a hand, and after a finish when retained results exist.

## Validation

Run from `projects/cedar-table`:

```sh
npm test
npm run check
```

- **66/66 tests pass**: the former 61-test baseline plus five focused CSV tests.
- CSV tests cover exact header/order, all five winner values, UTC timestamps and estimated flags, exact and fractional milliseconds with `m:ss` Played formatting, Unicode, commas/quotes and embedded CRLF escaping, formula protection for `=`, `+`, `-`, and `@` after whitespace, empty/invalid input, unrepresentable dates, a small exact exported row for the first valid retained West duplicate against a later conflicting East duplicate, newest-50 retention, and input non-mutation.
- `npm run check` includes `history-csv.js` and passes.
- Final independent validation again passed **66 tests** and all syntax checks. The reachable browser graph has 11 modules and 15 local import edges, all at `v=13`.
- Browser validation exercised a retained West Ron result while the East wins filter showed zero matches: downloading before Continue and again after Continue produced byte-identical 182-byte CSV files. The ended page remained at 20 wall tiles, Played `3:55`, and one East loss; export did not change the filter or statistics.
- With no History, both All results and Draws left export disabled; the saved hand remained at 68 wall tiles and Played `12:33`. Both tested browser origins had no console errors.
- Scoped diff whitespace validation passes. Existing unrelated evidence and `data/` edits remain untouched and unstaged.

## Browser Evidence

- [Zero-match retained-history export screenshot](feature-10/export-with-no-matches.jpg)
- [Empty-history disabled-export screenshot](feature-10/empty-history-disabled.jpg)
- [Downloaded 182-byte CSV fixture](feature-10/downloaded-history.csv)
- [Browser validation record](feature-10/browser-validation.json)
- [Final validation record](feature-10/validation.json)

### Coverage Limits

- Nonempty-history export while actively playing or paused was not exercised in the browser. Those paths were inspected in source only.
- Download-preparation failure handling was not injected or browser-tested; that path was inspected in source only.

## Scoped commits

- `5735668 feat: export completed hand history CSV` (implementation)
- `b81fc06 test: strengthen CSV export regressions` (test coverage)

Ready for Review — @Andy Chen. Status remains **In Progress**; approval is **Pending**.


## Ten-session conversation package

Ready for Review — @Andy Chen. Status remains **In Progress**, approval **Pending**.

- [Consolidated ten-feature review](FEATURES-1-10-READY-FOR-REVIEW.md).
- [Combined JSON](../../../data/cedar_table/vibe_combined.json): ten original conversations, 100 questions, 152 exact citations.
- [D10 original conversation](../../../data/cedar_table/D10/conversation.md), [timestamp mapping](../../../data/cedar_table/D10/source-map.json), and [annotation review](../../../data/cedar_table/D10/annotation-review.md).
- [Validation report](conversation-validation.json): archive hashes, timestamps, numbering, reference field structure, exact quotations, session labels and three answer-dependency chains pass.
- All eight question categories are covered. The full-set distribution differs from the supplied sample by at most 0.5 percentage points; semantic review was performed in addition to count checks.
- Final documentation checkpoint: `ac95e5b`. No review approval has been recorded.
