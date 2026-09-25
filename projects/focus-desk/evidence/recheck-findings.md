Historical recheck report: all four findings below are now resolved in [repair verification](repair-verification.md). Dialogue IDs below refer to the pre-repair export and can be translated using `../../../data/focus_desk/message-renumbering.json`.

Original review status: In Progress. Changes were needed before approval. This review supersedes the earlier claim that all annotation categories had passed content review. App source and original conversation records were not changed during this check.

## 1. P1 — The combined conversation omits 44 recorded progress replies without an exclusion ledger

The combined file and readable conversations contain nine user messages and nine final replies. The archived `run-*.jsonl` files also contain 44 replies with `phase: commentary`: D1 has 9, D2 has 11, D3 has 11, and D4 has 13. These are recorded progress replies, not private reasoning or tool results. `scripts/prepare_conversations.py:35` reads only `chat-history.json`; its transformation list records removal of the user-input envelope but does not account for excluding those progress replies.

This omission changes the available evidence. For example, `data/focus_desk/D2/raw/run-1.jsonl:55` explicitly says that the title will be captured at the start, while D2:1 requests the title at the end. `D3/raw/run-1.jsonl:85` explains that workload derives from shared task estimates, which would provide more direct support for Q058 than its current citations. D4's early reference to D10 and its later correction are also present only in the raw progress messages.

The raw records remain available. Rebuild the complete readable/combined conversations with stable chronological mapping, or document an explicit approved selection rule and every excluded message. Any changed message numbering requires rebuilding all evidence references and dependencies. Do not describe the current 18-message view as the complete recorded conversation.

## 2. P2 — A task renamed during focus retains its start-time title in history

Browser reproduction on a fresh local origin:

1. Create `Snapshot before` and start focus.
2. Edit the task to `Snapshot at end` while the timer runs.
3. Finish the session early.
4. The task list shows `Snapshot at end`, but history and Insights show `Snapshot before` for the 15-second session.

D2:1 requests the name as it was when the session ended. `src/focus.js:52` captures it at creation, and `src/focus.js:116` copies that same value at completion. The finish path in `src/app.js:365` never resolves the task's current title. The existing title-snapshot test does not rename a task between start and finish, so it does not cover this requirement. See `screenshots/review-title-snapshot.png`.

Fix this in the original D2 conversation, preserving already-finished history. Add a meaningful regression check for a rename before finish and a later rename after finish. The current Q048 answer presents end-time capture as implemented behavior even though its evidence is only the request; distinguish the request from the verified implementation until repaired.

## 3. P2 — Some multihop and multi-session labels are not supported by the question's actual dependencies

Q043 asks how stale Insights was corrected; its full answer is explicitly stated in D4:4. Citing D4:3 as well does not turn that direct lookup into multihop. Q036's entire answer is also stated in D4:2's first bullet; using a shortened excerpt plus another message does not create a required second reasoning step.

Q051 asks which records supply task distribution. D4:1 alone states that Insights uses focus history, actual focused time, session count, and task distribution. Q048 can likewise be answered from D2:1, which mentions renaming/deleting and retaining the title at session end. These questions do not demonstrate the claimed cross-session dependency merely by naming earlier conversations or adding redundant citations.

Reclassify these questions or rewrite them to require the missing reasoning/source dependency, then recompute the distribution. Q010, Q022, Q035, and Q055 also need another dependency review. The current claims of 23 qualified multihop and 13 qualified multi-session items should not be accepted as final. The validator checks citation/session counts and exact text matching; it cannot establish semantic necessity.

## 4. P3 — Session-start fields use first-message times rather than the recorded session starts

`scripts/prepare_conversations.py:65` sets `session_start_utc` from the first message. The archived `session.json` files have a separate `started_at` value:

| Session | Recorded session start (UTC) | Current combined start (UTC) |
|---|---|---|
| D1 | 2026-09-25T02:14:00.801Z | 2026-09-25T02:14:01.143Z |
| D2 | 2026-09-25T02:39:25.304Z | 2026-09-25T02:39:25.639Z |
| D3 | 2026-09-25T03:00:20.078Z | 2026-09-25T03:00:20.398Z |
| D4 | 2026-09-25T03:19:18.886Z | 2026-09-25T03:19:19.216Z |

The differences are under half a second and do not affect feature order. For the requested exact provenance, preserve both values with explicit meanings and use the recorded session start in the combined start field. The validator currently enforces equality to the first message rather than checking `session.json.started_at`.

## Checks that passed

- All 30 app tests passed with no skips; syntax checks passed.
- Existing combined-schema, citation, raw-checksum, and dependency-format validation passed.
- All archived run logs parsed as JSON Lines, and all four original session IDs were distinct and sequential.
- The browser reproduction confirms the title mismatch above. Existing screenshots and the downloaded CSV sample remain in the evidence package.

The live hidden-page transition remains an unverified browser scenario from the earlier review. Passing tests and format checks do not resolve the findings above. Review approval remains pending.
