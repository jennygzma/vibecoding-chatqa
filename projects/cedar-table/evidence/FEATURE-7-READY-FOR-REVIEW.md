# Cedar Table — Feature 7 Ready for Review

> Historical feature checkpoint. Counts and validation reflect this checkpoint; see [the consolidated review](FEATURES-1-10-READY-FOR-REVIEW.md) for the current ten-session package.

**Status: In Progress**
**Reviewer: @Andy Chen**
**Approval: Pending**

## Ready for Review

Feature 7 adds a compact, English **Discards** section immediately below the table.

- East, South, West, and North each have a clearly labeled public river, displayed oldest to newest.
- The section shows the current wall count as **tiles remaining**, gives every seat a precise **tiles still in river** count, and says **No discards yet.** for empty rivers.
- River tiles are display-only `div` elements, never discard or claim buttons.
- A current offered tile is marked with both a gold outline and the text **Current claimable**, but only when its exact physical ID is still in that seat's river.
- Claimed tiles are not treated as replay history: existing game transitions remove them from the river and retain the same physical tile in its exposed Chii/Pon/Kan meld or Ron winning-tile location.
- The display projects the existing `state.discards`, `state.lastDiscard`, and wall count directly. It adds no saved history and does not read opponent concealed hands. Because it renders during every normal render, it remains visible while paused, before Continue, after a completed hand, and after the existing saved hand is restored.
- Flex-wrap layout and narrow-screen sizing keep rivers usable on small screens; claim text stays in the same non-wrapping group as its highlighted tile.

The browser asset graph was advanced consistently from `?v=8` to `?v=9` for this browser-visible correction, so an already-open page reloads the complete updated module graph safely. Saved-hand and history storage keys are unchanged.

## Validation

Run from `projects/cedar-table`:

```sh
npm test
npm run check
```

- **49/49 tests pass** and all JavaScript syntax checks pass.
- Focused Feature 7 coverage verifies seat/order and per-river counts, exact-ID behavior for duplicate tile faces and stale/wrong-seat offers, no projection mutation while concealed-hand access throws, persisted river restore, and real Chii, Pon, Kan, and Ron transitions that remove the claimed exact ID from its river, retain it in the correct meld or winning-tile destination, and conserve all 136 unique physical IDs before and after each claim.
- Scoped `git diff --check` passes. Pre-existing unrelated evidence/data changes remain unstaged and untouched.

## Observed Browser Review Checks

- Before Continue, reloading the existing localhost saved hand preserved **Played 5:16**, **74 tiles remaining**, all displayed physical tile IDs, and the selected **Slow** computer pace. The rivers were East 3 (West, North, Green), South 3 (1, 3, 5 Bamboo), West 2 (two distinct 2 Bamboo tiles), and North 2 (1 and 2 Characters); only South’s offered 5 Bamboo had the gold outline and attached claim label. River tiles measured **30 × 42px** while normal hand tiles remained **64px** wide. No page errors appeared. See [discard-rivers.jpg](feature-7/discard-rivers.jpg).
- After Continue, computer turns produced West’s Pon of 3 Characters. While paused at **72 wall tiles** and **Played 5:42**, the rivers displayed counts **3/3/4/2** and West’s 8 Bamboo was the only offered tile. Reloading preserved that complete display exactly. See [after-pon-paused.jpg](feature-7/after-pon-paused.jpg).
- A separately saved West Ron finish at `127.0.0.1` retained all four rivers with counts **17/16/16/13**, no claimable marker, and unchanged one-loss / **3:55** statistics and history after reopening. See [completed-hand-rivers.jpg](feature-7/completed-hand-rivers.jpg).
- Browser review found no errors. The repeated automated validation output is recorded in [tests.txt](feature-7/tests.txt) (**49 tests passing**) and [syntax-check.txt](feature-7/syntax-check.txt).
- Narrow-screen behavior is **CSS-reviewed only**: the compact river selectors and attached tile/badge grouping are defined in the narrow-width media rules, but a resized browser viewport review has not yet been run.

Ready for Review — @Andy Chen: Feature 7 is ready for local inspection. Status remains **In Progress**; approval is **Pending**.


## D7 conversation package

Ready for Review — @Andy Chen: review Feature 7 at implementation commits `ba98c98` and `80e7560`, with browser-review documentation in `09849b8`. The 49 passing tests, syntax results, and screenshots above support this review. Approval remains pending.

D7 is a separate original conversation, recorded from 2026-09-23 05:02:27.835 UTC through 05:12:09.165 UTC, with 33 visible messages. Its two substantive follow-up intervals were 90.560 and 164.037 seconds. All original timestamps and conversation boundaries are preserved.

- [D7 readable conversation](../../../data/cedar_table/D7/conversation.md)
- [D7 original records](../../../data/cedar_table/D7/chat-history.json)
- [D7 timestamp map](../../../data/cedar_table/D7/source-map.json)
- [Combined JSON: seven sessions and 70 questions](../../../data/cedar_table/vibe_combined.json)
- [Question categories and reference proportions](../../../data/cedar_table/annotation-profile.json)
- [D7 semantic and timing review](../../../data/cedar_table/D7/annotation-review.md)
- [Package validation](conversation-validation.json)
- [Browser checks](feature-7/browser-checks.json)

The package contains 815 original records, 226 visible messages, and 107 exact source citations. The sample field structure, chronological timestamps, citations, separate session boundaries, and existing answer-dependency targets pass validation. Category proportions differ from the sample by at most 0.6 percentage points. Features 8–10 have not started.
