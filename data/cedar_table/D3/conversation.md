# D3 — Completed-hand history

Status: In Progress. Approval pending.

## D3:1 · user · 2026-09-23T02:07:22.600Z

For the third feature, I want a history of completed Cedar Table hands. Keep the existing English table and the save, pause and Continue behavior. Show each finished hand with its result, winner or draw, finish date and time, and actual Played duration. Keep the newest records first and retain the latest 50 locally. Refreshing or continuing the same finished hand must not add another copy. An unfinished hand replaced with New hand should not appear as a completed result. Use the same active-time clock from feature 2; do not use elapsed wall time for Played. I prefer a compact History section below the table rather than a blocking dialog. Keep history separate from the resumable hand so a damaged history cannot erase the game. Handle unavailable storage clearly. Add meaningful tests for deduplication, retention, restore compatibility and damaged records. Work only on this third feature, run the existing checks, make a scoped local commit, and leave a Ready for Review note for @Andy Chen with status In Progress. Leave the existing data and previous review artifacts alone.

## D3:2 · assistant · 2026-09-23T02:07:25.964Z

## Plan

I’ll scope this strictly to the third feature: first inspect the project structure, existing persistence/active-time implementation from feature 2, test setup, and current git state so I can preserve prior work and review artifacts. Then I’ll implement compact, separately stored completed-hand history with safe storage handling and the requested deduplication/retention semantics, add focused tests, run the project’s existing checks plus the new tests, verify the changed files, create a scoped local commit, and add the requested review note without modifying existing artifacts.

## D3:3 · assistant · 2026-09-23T02:07:29.713Z

The workspace has uncommitted feature-2 evidence and existing review files, so I will not alter or stage them. The application already isolates active-time behavior in `clock.js` and current-hand persistence in `persistence.js`; next I’ll read those implementation boundaries and the existing review-note conventions, then make the history store a separate persistence concern so history failure cannot affect restoring the active hand.

## D3:4 · assistant · 2026-09-23T02:07:33.473Z

## Implementation approach

- Add a versioned `cedar-table.history.v1` record, distinct from `cedar-table.hand.v1`.
- Build history entries only when the state transitions to `ended`; use an immutable hand identifier persisted with the current save so refresh/Continue of that terminal hand upserts rather than duplicates it.
- Capture `clock.elapsed()` only after the existing clock is stopped at completion, preserving feature 2 active-time semantics.
- Validate history independently; malformed history is discarded/reinitialized without touching the resumable-hand key, while blocked history writes show a clear notice.
- Render a compact newest-first History list under the table.
- Cover deduplication, 50-record retention, current-save backward compatibility, and malformed/blocked history storage in `persistence.test.js`.

I’ll now retrieve the few missing render/game details needed for exact result wording, then apply coordinated source, test, and a new feature-specific review-note changes.

## D3:5 · assistant · 2026-09-23T02:07:46.076Z

I’ve confirmed terminal results supply reliable winner/draw and method data, while `clock.elapsed()` is the correct active duration source. I will keep current-hand save version compatibility by accepting saves that lack the new hand identity/finish timestamp, assigning those only on the next save. History validation will be deliberately narrower and wholly separate: a bad history key is removed or replaced independently and never invokes current-hand cleanup.

## D3:6 · assistant · 2026-09-23T02:07:59.432Z

The history container and storage constants are now in place. Next I’ll add the independent history API and integrate it into the existing save/restore lifecycle, including a stable per-hand ID that is retained in the save but does not alter the game state or rules.

## D3:7 · assistant · 2026-09-23T02:08:05.525Z

The persistence API now has a dedicated versioned history key with validation, newest-first deduplicating upserts, and a 50-item cap. I identified one additional correctness detail before wiring the UI: the terminal save must retain its original completion timestamp, so a refreshed finished hand keeps its real finish time rather than being stamped at the refresh. I’ll add that optional backward-compatible save field and then connect the app.

## D3:8 · assistant · 2026-09-23T02:08:34.946Z

The app now captures a terminal record only from terminal state, using the stopped active clock, and stores it separately. I’ll finish the integration by invoking it at all terminal paths, loading/rendering the compact list, and ensuring new hands reset only their own identity—not history.

## D3:9 · assistant · 2026-09-23T02:08:58.433Z

A compatibility edge case surfaced during integration: a legacy finished save has no hand ID, so after its first restore the generated ID must be written back to the current-hand save immediately; otherwise a later refresh would generate a second identity. I’ll make that persistence update, add the requested unit coverage, then run syntax/tests to catch any integration issues.

## D3:10 · assistant · 2026-09-23T02:09:05.858Z

The source compatibility update and README documentation succeeded. The style insertion did not match because the earlier selector was intentionally expanded; I’ll read that local CSS region and, in parallel, add focused persistence tests using the existing in-memory storage harness.

## D3:11 · assistant · 2026-09-23T02:09:13.460Z

Syntax checks pass with the new APIs and UI wiring. I’ll now complete the compact History styling and add the specified behavioral tests: deduplication with active-time values, 50-entry retention/newest ordering, v1 current-save compatibility, and damaged/unavailable history isolation from the active save.

## D3:12 · assistant · 2026-09-23T02:09:24.361Z

The requested test cases and compact styling are in place. I’ll now run the full existing suite and syntax checks, inspect the exact diff for unintended scope, and use the results to make any corrections before creating the feature-specific review note and commit.

## D3:13 · assistant · 2026-09-23T02:09:31.875Z

Full validation passes: **24 tests** and all syntax checks. The repository-wide whitespace check correctly reports only the pre-existing modified `evidence/REVIEW.md` plus one blank line in my new test file; I will preserve the evidence file and remove only my blank line. I also found and will correct a restore-path bug: the existing “wait for Continue” guard prevents writing the newly assigned ID for a legacy terminal save, so I’ll use a narrowly scoped forced save during that migration.

## D3:14 · assistant · 2026-09-23T02:09:43.114Z

The legacy-finished-save migration is now safe: it generates and immediately persists one stable hand ID even while the restored table awaits Continue, so subsequent refreshes upsert the same history row. The history notice also clears after a successful retry. I’ll run final checks and inspect only feature-3 files, then create a new, separate Ready-for-Review note (leaving the existing review artifacts untouched), stage only this feature’s files, and commit.

## D3:15 · assistant · 2026-09-23T02:09:50.817Z

All final checks pass and the scoped diff contains only the history feature implementation, tests, styling, documentation, and no changes to existing evidence/review artifacts. I’ll now add a new Feature 3 review note addressed to **@Andy Chen** with **In Progress** status, then stage only the six feature files plus this new note and create the requested local commit.

## D3:16 · assistant · 2026-09-23T02:09:54.349Z

The separate review note has been created without touching prior review artifacts. I’ll verify its contents and the staged scope, commit only the feature-3 files, then inspect the resulting commit and working tree to confirm all pre-existing evidence changes remain unstaged and intact.

## D3:17 · assistant · 2026-09-23T02:09:56.448Z

The staged-scope check caught trailing Markdown line-break spaces in the new note. I’ll remove those only from the new Feature 3 note, rerun the staged diff checks, commit the verified scoped set, and inspect post-commit status.

## D3:18 · assistant · 2026-09-23T02:10:03.935Z

The scoped local commit was created successfully as `8a491d5` (`feat: retain completed hand history`). The post-commit status shows only the pre-existing Feature 2 evidence/review modifications and untracked artifacts; none were staged or included. I’ll perform one final post-commit verification of the committed file set, commit metadata, working-tree separation, and the full checks.

## D3:19 · assistant · 2026-09-23T02:10:07.877Z

## Feature 3 complete — Ready for Review

Implemented and committed completed-hand history as:

- **Commit:** `8a491d5953f7a908b09b04535b62aaa7e56091c9`
- **Message:** `feat: retain completed hand history`

### Delivered
- Compact **History** section below the Mahjong table.
- Shows completed hand result (winner/method or Draw), finish date/time, and active **Played** duration.
- Uses the existing active-time clock; no wall-clock elapsed duration is used.
- Newest-first ordering and retention capped at **50** records.
- Stable hand IDs prevent duplicates when refreshing or continuing a finished hand.
- Unfinished hands replaced through **New hand** are not recorded.
- History persists independently from the resumable hand:
  - damaged history is safely cleared without touching the game save;
  - blocked/unavailable history storage is clearly reported;
  - current-hand persistence remains compatible with existing v1 saves.
- Existing English UI and Save/Pause/Continue behavior were retained.

### Tests and validation
- `npm test` — **24 passing tests**
- `npm run check` — passed
- Added focused coverage for:
  - completed-hand deduplication and active Played duration;
  - newest-first 50-record retention;
  - legacy current-save compatibility;
  - damaged/blocked history isolation from the resumable hand.

### Review note
Created:
`projects/cedar-table/evidence/FEATURE-3-READY-FOR-REVIEW.md`

It is marked **Status: In Progress**, **Reviewer: @Andy Chen**, and **Approval: Pending**.

### Scope preservation
Existing Feature 2 evidence/review edits and untracked artifacts remain unstaged and were not included in the Feature 3 commit.

## D3:20 · user · 2026-09-23T02:11:35.990Z

I refreshed the game and chose Continue, then refreshed again. The West Ron history row stayed single and Played stayed at 3:55. I found two things to fix before moving on. Calling addCompletedHand with an older completed hand puts it ahead of a newer one; I reproduced old=100 and new=200 ending up in [old,new] after reloading old. Sort by finishedAt before applying the 50-record limit, including when reading history, and keep a repeated hand record immutable. Also merge the latest stored history before adding a result so an older open tab cannot overwrite newer results. The History section currently separates the table from my hand; please move it below my hand. For legacy saves, the last saved timestamp is not necessarily the finish time, so label it honestly rather than claiming an exact finish. Add focused regression coverage, rerun the checks and commit this follow-up in the same feature.

## D3:21 · assistant · 2026-09-23T02:11:39.637Z

## Plan

I’ll make this follow-up only within Feature 3. I’ll inspect the committed history implementation and tests, then update ordering and immutable-upsert behavior, merge the freshest stored history immediately before terminal writes, relocate the History section below the player hand, and make legacy terminal timestamps explicitly approximate rather than exact. I’ll add focused regression tests for the ordering/immutability, load-time sorting, and concurrent-tab merge behavior, run the full checks, review the scoped diff, and create a follow-up commit.

## D3:22 · assistant · 2026-09-23T02:11:54.862Z

I confirmed the reported behavior in the current implementation: insertion order, rather than completion time, controls history order; a repeated ID replaces the existing entry; and completion writes rely on in-memory history. I’ll centralize normalization (deduplicate, sort by `finishedAt` descending, then cap), preserve an existing ID’s original record, reload history immediately before each terminal write, and add an explicit approximate-finish flag for legacy terminal saves.

## D3:23 · assistant · 2026-09-23T02:12:12.223Z

The core history behavior is now normalized in one place: all reads and writes sort newest-first before capping, and an existing hand ID is retained unchanged rather than being overwritten. I’ll now finish the app integration: merge a fresh stored history immediately before upserting, persist the legacy-timestamp estimate state with the resumable save, and move the markup below East’s hand.

## D3:24 · assistant · 2026-09-23T02:12:34.687Z

The completion write now reloads persisted history before adding the terminal entry, but I can make that concurrency guarantee more explicit and directly testable by moving the read–merge–write sequence into `persistence.js`. I’ll do that next, then wire the legacy estimate restore state and relocate the History markup.

## D3:25 · assistant · 2026-09-23T02:12:55.935Z

The UI placement and write path are updated: History now follows East’s hand, and the storage-level add operation reloads the latest persisted list before merging the completed hand. Legacy terminal saves carry a persisted “estimated finish” marker so the display says “Finished around” rather than asserting an exact completion time. I’ll add targeted persistence regressions for all of these storage semantics before validation.

## D3:26 · assistant · 2026-09-23T02:13:06.674Z

Focused regressions now cover the reported old/new reordering, immutable duplicate records, sorting before the 50-record cap on read, and merging an older tab’s result with a newer stored record. I’ll run the suite and syntax checks now, then inspect the exact follow-up diff and correct anything surfaced before committing.

## D3:27 · assistant · 2026-09-23T02:13:13.161Z

Validation is green with the new regressions, and the scoped change is limited to `projects/cedar-table/app.js`, `persistence.js`, `persistence.test.js`, and `index.html`. I verified the legacy path marks inferred timestamps as estimated, while newly finished hands retain exact completion timestamps. I’ll perform the final clean checks, stage only those follow-up files, commit them, and confirm the existing unrelated evidence remains unstaged.

## D3:28 · assistant · 2026-09-23T02:13:17.404Z

All requested behavior is now covered and checks pass: **25 tests** plus syntax validation. The final diff is limited to the four implementation/test files; no prior evidence or review artifacts will be touched. I’ll stage and commit only this follow-up, then confirm the commit’s file list and that the pre-existing workspace artifacts remain unstaged.

## D3:29 · assistant · 2026-09-23T02:13:26.459Z

Implemented and committed the History follow-up.

### Changes
- History is now consistently sorted by `finishedAt` descending before the 50-record cap:
  - when adding a result;
  - when reading stored history;
  - when writing history.
- Repeated `handId` records are immutable: an existing record is retained rather than replaced with changed result/time/Played values.
- Terminal writes now reload and merge the latest local-storage history immediately before adding the current result, protecting newer results created by another open tab.
- Moved the **History** section from directly below the table to directly below **East — your hand**.
- Legacy finished saves that only have a last-save timestamp now display `Finished around: …` rather than claiming an exact finish time. The inferred-status flag persists after restore.
- Added focused regressions for:
  - out-of-order completion timestamps;
  - immutable repeated IDs;
  - sorting stored history before retention trimming;
  - merging an older tab’s result with newer stored history.

### Validation
- `npm test` — **25 passing tests**
- `npm run check` — passed
- Scoped staged-diff whitespace check — passed

### Commit
`3c33ba5 fix: preserve ordered completed hand history`

Only the four intended files were included:
- `projects/cedar-table/app.js`
- `projects/cedar-table/index.html`
- `projects/cedar-table/persistence.js`
- `projects/cedar-table/persistence.test.js`

Existing unrelated Feature 2 evidence edits and untracked artifacts remain unstaged.
