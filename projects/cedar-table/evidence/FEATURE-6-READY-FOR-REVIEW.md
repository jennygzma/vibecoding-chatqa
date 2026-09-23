# Cedar Table — Feature 6 Ready for Review

> Historical feature checkpoint. Counts and validation reflect this checkpoint; see [the consolidated review](FEATURES-1-10-READY-FOR-REVIEW.md) for the current ten-session package.

**Status: In Progress**
**Reviewer: @Andy Chen**
**Approval: Pending**

## Ready for Review

Feature 6 adds a compact English **Computer pace** setting in the header:

- **Slow** — 1500 ms
- **Normal** — 800 ms (default)
- **Fast** — 300 ms

The selection is persisted independently as `cedar-table.computer-pace.v1`. It survives reloads and new hands without changing the existing `cedar-table.hand.v1` saved-hand key, `cedar-table.history.v1` completed-history key, or the practice-hint behavior.

Automatic computer discards and automatic claim resolutions each wait for the selected full delay. East's own discard and claim choices are never delayed. Changing pace cancels an eligible pending timer and schedules exactly one next legal automatic step at the full new delay. The generation-protected scheduler also makes a callback that arrives after cancellation harmless, preventing duplicate moves.

If browser storage blocks a newly selected pace, that pace still applies for the current page and a short, separate Computer pace notice explains that it could not be saved. A later successful pace save clears that notice without changing saved-hand or History notices.

Pause, hidden/page-hide, Continue-gated restored hands, finished hands, East's discard turn, and an awaiting human claim all leave no automatic step queued. Resume and Continue schedule only the next legal automatic step with a fresh selected delay. The active Played clock is unchanged by pace selection.

## Evidence

Run from `projects/cedar-table`:

```sh
npm test
npm run check
```

- **44/44 tests pass** and JavaScript syntax checks pass.
- The production `canScheduleAutomaticComputerStep` helper is used by `app.js` for both scheduling and callback revalidation. Direct tests allow only automatic claims and non-East discards, and cover paused, hidden, Continue-gated, human-claim, East-discard, and finished blocking states.
- Controlled-clock scheduler tests assert exact 300 ms, 800 ms, and 1500 ms firing boundaries; replacement after 400 ms waits a full new 1500 ms; every blocked-state case starts with a fresh pending callback and cancels it; resume waits a full fresh 800 ms rather than a remainder; and stale callbacks cannot move twice.
- Preference tests cover the Normal default, valid persistence, invalid stored/input values, unavailable storage, page-local application after a failed pace save, and clearing the separate pace notice after a later successful save.
- A local HTTP smoke check confirmed the Computer pace control and one consistent `?v=7` browser asset graph.
- Existing hand/history keys and practice hints were preserved.

Ready for Review — @Andy Chen: Feature 6 is ready for local review. Status remains **In Progress**; approval pending.


Ready for Review — @Andy Chen: Final feature revision `569827b`, following `070267a`. Status: **In Progress**. Approval: **Pending**.

- Final full suite: 44/44 passing; syntax checks pass. [Test output](feature-6/tests.txt), [syntax checks](feature-6/syntax-check.txt).
- [Computer pace screenshot](feature-6/computer-pace.jpg) and [browser observations](feature-6/browser-checks.json).
- Slow remains selected after reload; Continue remains required. Changing speed while East decides preserves the hand, wall and practice hint. Played continued from 4:22 to 4:38 rather than resetting.
- During an actual computer turn, Pause held 74 wall tiles and Played 5:14. On Resume, no next discard was visible at 834 ms; South had discarded at 1754 ms. These are approximate observations around the selected 1500 ms delay; controlled-clock tests establish exact boundaries.
- The current-hand reset function was checked with isolated in-memory storage: it preserves both the pace preference and completed history. Storage-failure notice behavior was checked through the production helper, including clearing the notice on a later successful save.
- D6 is one original conversation, with all corrections retained in it. Its 10 annotations bring the package to 6 sessions, 60 questions and 93 verified exact citations. [Combined JSON](../../../data/cedar_table/vibe_combined.json), [D6 transcript](../../../data/cedar_table/D6/conversation.md), [source map](../../../data/cedar_table/D6/source-map.json).
- Original D6 session: `1790137421512_yv5k5`; start `2026-09-23T04:23:42.259Z`, last recorded reply `2026-09-23T04:30:40.254Z`.
- Follow-up D6:13 was recorded 119.793 seconds after the preceding reply, following the browser checks and source review described in that message.
- Initial window recovery occurred before D6 was submitted and is not inserted into its recorded conversation. Timestamps and original roles are preserved.
- Features 7–10 remain unstarted.
