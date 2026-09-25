# Cedar Table — Feature 2 Ready for Review

> Historical feature checkpoint. Counts and validation reflect this checkpoint; see [the consolidated review](FEATURES-1-10-READY-FOR-REVIEW.md) for the current ten-session package.

**Status: In Progress**
**Reviewer: @Andy Chen**
**Approval: Pending**

## Ready for Review

Feature 2 adds local hand persistence without changing the four-seat Cedar Table rules or English interface.

- Every human and computer transition saves the hand locally.
- The monotonic active-hand clock visibly advances while the table is active, including while East considers a claim. It saves before a page is hidden or left, and stops while paused, hidden, closed, or after the hand finishes.
- Refreshing or reopening restores the exact physical-tile state, including a pending claim or completed hand, but waits for **Continue hand** before any automatic turn can run. Continue is hidden during ordinary active play.
- **Pause** freezes automatic turns and active-hand time. The table shows its last saved time and active played time.
- **New hand** requires confirmation before clearing/replacing the local save.
- Restore validation checks all canonical physical tile identities, meld shapes, phase invariants, pending-discard ownership, and whether an awaiting-human claim is the actually selected legal claim. It also accepts the valid, unresolved claim window saved immediately after a discard; it resolves only after **Continue hand** permits automatic play.
- Damaged and unavailable local storage are explained in the interface while a usable new hand remains available, including when reading `window.localStorage` itself is blocked.

## Tests and validation

Run from `projects/cedar-table`:

```sh
npm test
npm run check
```

Validated on 2026-09-22:

- **20 Node tests passed** after the Feature 2 timing, validation, and unresolved-claim restore follow-up.
- Monotonic clock tests cover active ticking, restored elapsed time, and stopping/resuming across hidden/page-leave lifecycle boundaries.
- Pending-claim persistence tests restore the same physical discard ID, the selected legal human Pon, and the real pre-resolver North 3 Bamboo discard that gives East Ron. The latter stays unresolved until continuation, then offers and completes Ron.
- Finished-hand persistence test reaches a real East tsumo through the game transition and restores its terminal result.
- Corrupted rank-99 tile data and `awaitingHuman` on a normal discard phase are rejected; damaged JSON and blocked storage access also recover gracefully.
- Complete-hand simulations continue to conserve all 136 unique physical tile IDs after every transition; four deterministic hands now also serialize and restore after every transition before continuing.
- Local HTTP smoke check confirmed the Continue hand, Pause, and save-time controls are served.

## Local commit

Feature 2 implementation revision: `669a57b109be22b0ba2334dcce098fe27b8105b8` — `feat: persist Cedar Table hands locally`.

This feature intentionally remains **In Progress** for reviewer approval.


## Final review evidence

Ready for Review — @Andy Chen: Feature 2 is ready for inspection at source checkpoint `b66173d78760a6655da49f6c712b5ee2c309446a`. Status remains **In Progress**, with approval pending. Feature 3 has not started.

- [Open the current preview](http://127.0.0.1:4340). Saves belong to the same browser and address. To reopen this preview later, start `python3 -m http.server 4340 --bind 127.0.0.1` from the project folder and use the same address.
- Final independent verification: **20 tests passed**, syntax checks passed, and source files match the checkpoint.
- The pending North 6 Bamboo discard and East Pon survived refresh. The same physical hand and exposed melds were retained.
- During a pending claim, Played advanced from **1:01 to 1:07**. Pausing retained **1:07**. Leaving and returning retained **1:12** without counting time away.
- The continued browser hand reached **West wins by Ron!**, with **20 wall tiles** and **3:55** played. After refresh and Continue, the result, tiles, melds, and **3:55** duration stayed unchanged.
- [Saved-hand continuation screen](feature-2/continue-saved-hand.jpg)
- [Restored finished-hand screen](feature-2/restored-finished-hand.jpg)
- [Browser observations](feature-2/final-browser-checks.json)
- [Continued-hand actions](feature-2/continued-hand-actions.json)
- [Verification summary](feature-2/validation.json)

## Conversation and annotation review

- [Combined D1 and D2 JSON](../../../data/cedar_table/vibe_combined.json): **2 original conversations, 93 visible messages, 20 questions, and 33 exact citations**.
- [D2 with actual message times](../../../data/cedar_table/D2/conversation.md)
- [D2 original record](../../../data/cedar_table/D2/chat-history.json)
- [Timestamp and source mapping](../../../data/cedar_table/source-map.json)
- [Actual response intervals](../../../data/cedar_table/session-index.json)
- [Category profile](../../../data/cedar_table/annotation-profile.json)
- [Citation and format validation](conversation-validation.json)

The first review snapshot remains in the local archive. D1 text, message numbering, timestamps, and original session identity are unchanged. Its two ordinary implementation-change questions no longer carry the temporal label. The current set has **4 multi-session questions** and **3 temporal questions about excluded time, retained duration, and the active-time clock**. Classification proportions remain subject to review across the final ten features.

D2 was recorded from **2026-09-22 23:14:16.344 UTC** to **23:33:31.926 UTC**. Its two follow-up requests came **487.182 seconds** and **250.988 seconds** after the preceding replies. These are original recorded times.
