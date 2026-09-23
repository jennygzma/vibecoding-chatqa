# Cedar Table — Feature 8 Ready for Review

> Historical feature checkpoint. Counts and validation reflect this checkpoint; see [the consolidated review](FEATURES-1-10-READY-FOR-REVIEW.md) for the current ten-session package.

**Status: In Progress**
**Reviewer: @Andy Chen**
**Approval: Pending**

## Ready for Review

Feature 8 adds East's deliberate, English select-then-confirm discard flow.

- Clicking an enabled East hand tile selects its exact physical tile ID; it does not discard it.
- The selected tile has a visible highlight and `aria-pressed="true"`. Keyboard users retain the existing tile buttons plus ordinary **Confirm discard** and **Cancel** buttons, with a clear focus-visible outline.
- The hand area shows **Selected: &lt;tile name&gt;**, **Confirm discard**, and **Cancel** only for a valid current choice. Selecting a different tile changes the choice; selecting the same tile retains it.
- Selection and confirmation each receive and recheck the current activity gate at click activation, in addition to revalidating East's legal active discard turn and hand membership. Confirmation resolves the current tile index from the selected physical ID immediately before calling the existing game discard transition, so stale IDs, inactive play, and turn changes cannot discard a tile. A consumed confirmation cannot produce a second discard.
- Cancel and selection-only interactions leave the hand and valid practice hints unchanged. A confirmed game action clears the temporary choice and follows existing action behavior.
- The temporary choice is not in game state, saved hands, history, or preferences. It is cleared for a real action/turn transition, Pause, visibility hiding, page hide/reload, Continue, restart, and hand end. Ordinary Analyze hand and computer pace renders preserve a still-valid selection.
- Played time continues while East considers a selection because the existing active clock remains running; existing paused, hidden, waiting-to-continue, and finished exclusions are unchanged.
- Public discard rivers remain display-only and unchanged. The complete browser module graph, including the new local selection module, uses `?v=11`; saved-hand and preference keys are unchanged.

## Validation

Run from `projects/cedar-table`:

```sh
npm test
npm run check
```

- **56/56 tests pass** and all JavaScript syntax checks pass.
- Focused Feature 8 tests exercise production selection/confirmation logic for duplicate faces with distinct physical IDs, stale missing IDs, changed turns, activity-gate rejection on both activation paths, ID-based index resolution after hand reordering, cancellation without hand mutation, retention through ordinary valid reads, illegal-turn rejection, and at-most-once confirmation before and through the real game discard transition.
- Scoped `git diff --check` passes. Existing unrelated evidence and `data/` edits remain unstaged and untouched.

## Browser observation record

### Selection, cancellation, and lifecycle observations

- On the saved hand after East accepted the offered **Pon of 8 Bamboo**, East had 11 concealed physical tiles, the wall remained at 72, and the public river counts were 3/3/3/2.
- Selecting the first East wind selected physical ID `east-0`; selecting it again retained that choice. Selecting the other East wind changed the choice to `east-2`. None of those selection clicks moved a tile.
- **Analyze hand** and changing computer pace from Slow to Normal preserved the valid `east-2` selection and the visible practice-hint text. **Cancel** cleared the choice without changing the hand or clearing the valid hints.
- Played time advanced from 9:56 to 10:15 during these selection checks. **Pause** cleared both selection and hints; Played remained 10:45 while paused.
- After **Resume**, selecting a tile and reloading restored **Continue** with the same 11 physical hand IDs, no pending selection, and Normal still selected.

### Final browser check — revision `v=11`

- Selecting `east-2`, running **Analyze hand**, and changing Computer pace back to Slow preserved both the selected tile and the hint panel across those rerenders.
- **Confirm discard** moved only `east-2` into East's public river exactly once; `east-0` remained in East's hand. East's concealed count changed from 11 to 10 and East's river count from 3 to 4.
- Pausing before the next computer step left the wall at 72 and Played at 11:05, removed the choice/confirmation controls, and cleared stale hints. History/statistics still showed no completed hand.
- Reloading preserved the exact ten East hand IDs and river IDs, with no pending selection and Played still 11:05. No browser errors occurred.
- Final browser artifacts are retained at `evidence/feature-8/selected-east-final.jpg`, `evidence/feature-8/confirmed-discard.jpg`, `evidence/feature-8/browser-checks.json`, `evidence/feature-8/tests.txt`, and `evidence/feature-8/syntax-check.txt`.

### Accessibility and lifecycle review scope

- The browser check covered visible selection/confirmation controls and the selected tile's accessible pressed state.
- Keyboard focus styling/native-button semantics and hidden-page clearing were reviewed in source. This record does **not** claim separate keyboard-interaction or hidden-tab-interaction browser tests.


Ready for Review — @Andy Chen: Feature 8 is ready for local inspection. Status remains **In Progress**; approval is **Pending**.


## D8 conversation package

Ready for Review — @Andy Chen: review Feature 8 at implementation commits `8e391dd` and `568c0f7`, with browser-review documentation in `5f5482f`. The 56 passing tests, syntax checks, exact tile-movement evidence, and screenshots above support this review. Approval remains pending.

D8 is a separate original conversation, recorded from 2026-09-23 05:20:37.499 UTC through 05:30:38.728 UTC, with 29 visible messages. Its substantive follow-up intervals were 160.085 and 145.856 seconds. Original timestamps, message IDs, and speaker roles are preserved.

- [D8 readable conversation](../../../data/cedar_table/D8/conversation.md)
- [D8 original records](../../../data/cedar_table/D8/chat-history.json)
- [D8 timestamp map](../../../data/cedar_table/D8/source-map.json)
- [Combined JSON: eight sessions and 80 questions](../../../data/cedar_table/vibe_combined.json)
- [Category distribution](../../../data/cedar_table/annotation-profile.json)
- [D8 semantic and timing review](../../../data/cedar_table/D8/annotation-review.md)
- [Package validation](conversation-validation.json)

The package contains 917 original records, 255 visible messages, and 123 exact source citations. Field structure, session boundaries, timestamps, citation targets, and existing answer-dependency targets pass validation. Category proportions differ from the sample by at most 0.8 percentage points. Features 9–10 have not started.
