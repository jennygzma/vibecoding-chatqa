# Cedar Table — Feature 9 Ready for Review

> Historical feature checkpoint. Counts and validation reflect this checkpoint; see [the consolidated review](FEATURES-1-10-READY-FOR-REVIEW.md) for the current ten-session package.

**Status: In Progress**
**Reviewer: @Andy Chen**
**Approval: Pending**

## Ready for Review

Feature 9 adds a temporary English **History result** filter for the existing retained latest 50 completed hands.

- **All results** is the default, with **East wins**, **Losses**, and **Draws** filters.
- History keeps newest-first ordering, finish timestamp wording, and Played durations. It shows the filtered/retained count and provides **Show all results** when saved history has no matching result.
- Filtering normalizes, deduplicates, sorts, and caps history before matching; it does not read older records or rewrite storage.
- Statistics continue to use every retained completed result, including draws, independently of the current filter.
- The filter is page-local state: it survives ordinary renders and newly completed results in the current page, and returns to All results after reload.

## Browser review observations

- A saved West Ron appears under **Losses** as `Showing 1 of 1 saved hands.`; **East wins** and **Draws** each show `Showing 0 of 1 saved hands.`, **No matching results**, and **Show all results**.
- **Show all results** restores the saved row. On the ended hand, **Continue hand** preserves the selected filter; a reload returns the dropdown to **All results**.
- Statistics remained based on the one retained saved hand: one completed hand, one loss, 0% East wins, and total/average Played of 3:55.
- On localhost with no saved results, both **All results** and **Draws** show **No completed hands yet.**

## Final browser review

- After continuing the localhost hand, passing the offered Chii, and waiting for East to draw, the table had 68 tiles left. With **Analyze hand** open and physical tile `bamboo-4-0` (4 Bamboo) selected, changing History result from **Draws** to **East wins** preserved that exact selected ID, every visible tile ID, the **Confirm discard** control, and the hint: `No discard leaves this hand one tile from a standard winning hand.` See [selection and hints preserved](feature-9/selection-and-hints-preserved.jpg).
- The active Played reading advanced from 12:14 to 12:32 while reading and changing the filter, confirming an 18-second active interval. After pausing at 12:33, changing the filter to **Losses** kept Played at 12:33 and preserved the wall count.
- Both reviewed browser origins reported no console errors.
- Final History states are captured in [no matching East wins](feature-9/no-matching-east-wins.jpg), [Losses](feature-9/losses.jpg), and [empty history](feature-9/empty-history.jpg). Observed DOM and browser validation details are in [browser-validation.json](feature-9/browser-validation.json).

## Scoped commits

- `3093923 feat: filter completed hand history`
- `c73ad43 test: cover retained history filters`

## Validation

Run from `projects/cedar-table`:

```sh
npm test
npm run check
```

- **61/61 tests pass** and all JavaScript syntax checks pass, including exact winner-category IDs, first-valid duplicate retention, and an older-than-50-only match regression.

Ready for Review — @Andy Chen. Status remains **In Progress**; approval is **Pending**.


## Conversation and annotation package

Ready for Review — @Andy Chen. D9 is recorded as its own original conversation with real message timestamps; status remains **In Progress**, approval **Pending**.

- Implementation: `3093923`; regression coverage: `c73ad43`; browser review note: `24ac64b`.
- [Combined JSON](../../../data/cedar_table/vibe_combined.json): D1–D9, 90 grounded questions, 137 exact citations.
- [D9 conversation](../../../data/cedar_table/D9/conversation.md), [original records](../../../data/cedar_table/D9/chat-history.json), [timestamp mappings](../../../data/cedar_table/D9/source-map.json), and [annotation review](../../../data/cedar_table/D9/annotation-review.md).
- [Package validation](conversation-validation.json): sample field structure, original archive hashes, timestamp order, numbering, quotes, session labels, and three answer-dependency chains pass.
- [Category profile](../../../data/cedar_table/annotation-profile.json): all eight categories are represented; the largest percentage-point difference from the reference is 0.9 across the current 90 questions. Final distribution review remains pending for the full ten-feature set.
- D9 contains 10 questions: 8 single-session and 2 cross-session, with 5 singlehop, 4 multihop, 1 preference, 1 temporal, 3 knowledge-facts, and 1 open-domain labels. Categories overlap.
- Browser checks use separate localhost and loopback storage origins. A newly completed hand under an already-active filter was not exercised end-to-end; current-page retention is supported by source inspection, helper tests, and ordinary-render/Continue checks.
- Feature 10 has not started. Review approval has not been inferred from passing checks.
