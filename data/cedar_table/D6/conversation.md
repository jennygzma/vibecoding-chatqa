# D6 — Computer pace preferences and scheduling

Status: In Progress. Approval pending.

## D6:1 · user · 2026-09-23T04:23:42.259Z

For feature 6, add a compact Computer pace setting to Cedar Table, with Slow (1500 ms), Normal (800 ms), and Fast (300 ms). Default to Normal. I find the current fixed 400 ms computer steps too quick to follow. Keep the UI in English and remember the selected pace locally across reloads and new hands, independently of saved hands and completed-history records.

Apply the selected delay to each automatic computer/claim-resolution step, never to East's own choice. Changing pace while an automatic step is pending should cancel that pending timer and start one full delay at the new pace; it must not create duplicate moves. Pause, hidden pages, awaiting Continue, a finished hand, and waiting for a real human discard or claim must have no automatic step queued. Resume or Continue should schedule only the next legal automatic step with a fresh full delay. Keep the active Played clock independent of speed: do not scale or reset elapsed time when pace changes.

Use a small testable scheduler if useful. Test exact delays with a controlled clock, pending-timer replacement, cancellation/stale callbacks, waiting-for-human states, and invalid/unavailable preference storage. Preserve existing hand/history keys and practice hints. Bump the entire browser asset graph consistently so an old page can load the new feature normally. Run all tests and syntax checks, make a scoped local commit, and add a Ready for Review note for @Andy Chen with the evidence. Keep status In Progress, approval pending. Only feature 6 belongs in this new conversation; do not start features 7-10. Do the work sequentially without spawning other agents.

## D6:2 · assistant · 2026-09-23T04:23:48.962Z

## Plan

I will work only on feature 6 and proceed sequentially:

1. Inspect the application structure, current computer-step timing, persistence keys, tests, asset-versioning/service-worker setup, and project scripts.
2. Design the pace preference and a cancellable, testable scheduler that preserves the existing game-state constraints.
3. Implement the compact English UI, local preference persistence, timing behavior, and browser asset-graph version updates without changing hand/history storage or hints.
4. Add focused controlled-clock tests for exact delays, replacement/cancellation/stale timer protection, human-wait states, and invalid/unavailable storage.
5. Run the full test suite and syntax/build checks, inspect the final diff, create a scoped local commit, and add the requested Ready for Review note while leaving status as In Progress and approval pending.

I’ll first gather all independent repository context needed to align the implementation with the existing conventions.

## D6:3 · assistant · 2026-09-23T04:23:53.682Z

The repository is a dependency-free ES-module browser app with Node’s built-in test runner. The working tree already contains unrelated, uncommitted evidence material from earlier features; I will not modify or include it. The current asset revision is `v=5`, and the app already centralizes saved-hand/history persistence and active-clock behavior.

Next I’ll read the implementation and focused tests in full, including the review-note conventions, so the scheduler integrates cleanly and the new commit stays scoped to feature 6.

## D6:4 · assistant · 2026-09-23T04:23:58.423Z

The timing path is currently a single raw `setTimeout(..., 400)` in `app.js`. I’ll replace that with an isolated scheduler module rather than attempting to unit-test DOM event wiring. Its contract will be: it owns at most one callback, cancellation invalidates stale callbacks even if a timer implementation invokes one after clearing, and rescheduling always uses the complete newly selected delay. `app.js` will call it only when the game is legally eligible for an automatic computer turn or claim resolution.

I’ll now inspect the omitted application functions and current feature-review format, then implement the module, UI, preference persistence, tests, and synchronized `v=6` graph.

## D6:5 · assistant · 2026-09-23T04:24:12.002Z

## Implementation approach

- Add `computer-pace.js` for the independently stored `cedar-table.computer-pace.v1` preference. It validates only Slow/Normal/Fast, defaults safely to Normal (800 ms), and never touches the existing hand/history keys.
- Add `computer-scheduler.js`, dependency-injected with timer functions for deterministic tests. Its generation guard makes cleared/stale callbacks harmless and guarantees a single active timer.
- Replace the fixed timer in `app.js` with legal-step gating: only unresolved automatic claims or non-East discard turns schedule; all paused, hidden, Continue-gated, ended, and East decision states cancel.
- Add a compact English `<select>` in the header. Selecting a new pace saves it locally and replaces an eligible pending timer with one full new delay, without interacting with the active clock.
- Update all browser-facing local module URL edges and stylesheet/entry URL to `?v=6`, preserving existing persistence keys and practice hints.
- Add focused Node tests using a controlled timer/clock and storage doubles, then validate and commit only the feature files plus its dedicated review note.

## D6:6 · assistant · 2026-09-23T04:25:00.391Z

The scheduler and preference modules are now in place, and `app.js` schedules only a legal automatic claim resolution or a non-East computer discard. A pace change calls the same cancellation-first scheduling path, so it restarts the full selected delay while leaving the active clock untouched.

I’ll now add the compact styling and deterministic tests, then update every browser module edge to the same `v=6` revision and extend the project’s syntax-check script to cover the two new modules.

## D6:7 · assistant · 2026-09-23T04:25:38.873Z

The focused tests cover the requested timing boundaries: exact 800/1500/300 ms-style scheduling mechanics, full-delay replacement, stale-callback suppression, and the legal-state predicate that excludes paused/hidden/Continue-gated, human-claim, East-discard, and ended states. I spotted one null-storage edge in the preference writer before validation: optional chaining would incorrectly report a missing storage object as a successful save. I’ll correct that and then run the tests and syntax checks.

## D6:8 · assistant · 2026-09-23T04:25:51.398Z

Validation is green: **41/41 tests** and all syntax checks pass. The repository-wide whitespace check correctly reports only pre-existing, unrelated edits in `evidence/REVIEW.md`; it does not indicate a feature-6 source issue. I’ll strengthen the timing test to assert each advertised delay explicitly (300, 800, 1500 ms), inspect the final changed source, and run a scoped whitespace check plus a local browser asset smoke check.

## D6:9 · assistant · 2026-09-23T04:26:05.565Z

Final source inspection confirms:

- The only scheduling eligibility is an unresolved automatic claim or non-East discard; East discard, awaiting a human claim, ended, paused, hidden, and Continue-gated states all cancel/no-op.
- Visibility, page hide, new hand, pause/resume, and Continue use the same cancellation-and-fresh-schedule lifecycle.
- The active clock remains exclusively controlled by `createActiveClock`; pace changes neither stop, start, scale, nor reset it.
- The server smoke check served the compact selector and `v=6` entry/style URLs. The focused diff has no whitespace errors, tests remain **41/41 passing**, and syntax checks pass.

I’ll add the requested Feature 6 Ready for Review note, then inspect the exact staged scope and create a local commit without including the pre-existing evidence/data changes.

## D6:10 · assistant · 2026-09-23T04:26:13.147Z

The scoped review note is complete and preserves the requested review metadata: **In Progress**, reviewer **@Andy Chen**, and **Approval: Pending**. The storage-key check confirms the existing hand/history keys are unchanged and the pace uses its own new key.

The status output still shows the known unrelated modifications and untracked evidence/data. I will stage only these Feature 6 source, tests, documentation, asset-graph, and dedicated review-note files; verify the staged diff and commit boundary; then make the scoped local commit.

## D6:11 · assistant · 2026-09-23T04:26:20.082Z

The scoped commit was created successfully:

- `070267a feat: add computer pace setting`

It contains only the 13 Feature 6 files, including the dedicated review note. All pre-existing unrelated evidence/data changes remain unstaged and uncommitted. I’ll perform one final post-commit integrity check: confirm the commit’s review metadata, run the full checks from the committed worktree, and verify there are no accidental staged changes.

## D6:12 · assistant · 2026-09-23T04:26:26.896Z

## Feature 6 complete

Implemented compact **Computer pace** control in English:

- **Slow** — 1500 ms
- **Normal** — 800 ms (**default**)
- **Fast** — 300 ms

### Behavior delivered
- Pace applies to every automatic computer discard and automatic claim-resolution step.
- East’s discard and claim choices are never delayed.
- Changing pace cancels an eligible pending timer and starts exactly one full new delay.
- Scheduler prevents duplicate moves from cancelled/stale callbacks.
- No automatic step remains queued while paused, hidden/page-hidden, waiting for **Continue hand**, finished, awaiting a human claim, or awaiting East’s discard.
- Resume and Continue schedule only the next legal automatic step with a fresh delay.
- The active **Played** clock is independent of pace changes.
- Preference is stored separately as `cedar-table.computer-pace.v1`; existing saved-hand and completed-history keys remain unchanged, and practice hints are preserved.
- Browser module/style asset graph was consistently bumped from `?v=5` to `?v=6`.

### Tests and validation
- `npm test` — **41/41 passing**
- `npm run check` — passing
- Controlled-clock coverage includes:
  - Exact 300/800/1500 ms delays
  - Pending-timer replacement with a full new delay
  - Cancelled/stale callback suppression
  - Human/paused/hidden/Continue/ended/East-decision states with no queued work
  - Invalid and unavailable preference storage
- Local HTTP smoke check confirmed the pace selector and `v=6` asset URLs.

### Commit
Created scoped local commit:

```text
070267a21afb0bf0ade7e5f8215ea07648f77458 feat: add computer pace setting
```

### Review handoff
Added:

- `projects/cedar-table/evidence/FEATURE-6-READY-FOR-REVIEW.md`

It includes the requested **Ready for Review** note for **@Andy Chen**, with status **In Progress** and approval **Pending**.

Pre-existing unrelated evidence/data modifications remain unstaged and were not included in the Feature 6 commit.

## D6:13 · user · 2026-09-23T04:28:26.689Z

The browser checks look good: Slow stayed selected after reloading the original saved-hand page, and Continue was still required. On the active hand, switching Slow to Fast while I was choosing a discard left the wall at 79 tiles and kept the practice hint visible. Played advanced from 4:22 to 4:38 without resetting, then Pause stopped it.

I found a coverage gap in computer-scheduler.test.js: the human-decision test defines its own automaticStepAllowed expression instead of calling the production condition, so it can pass even if app.js is wrong. Please extract a small production eligibility helper that app.js actually uses, test it directly for automatic claims/computer discards and all blocking conditions, and seed a pending callback afresh before each blocked-state cancellation case. Keep tests for replacement and stale callbacks; also demonstrate that cancelling and then resuming starts a full delay, not the remainder.

One usability gap: saveComputerPace(null, 'slow') correctly returns ok:false, but the change handler ignores that result. Please show a short, separate notice when a pace choice cannot be saved, while applying it to the current page. Clear the notice after a later successful save. Do not erase or overwrite hand/history notices. Cover that result-handling path with a meaningful test or a testable production helper. Finish with the full tests and a scoped follow-up commit; keep this in D6 and retain In Progress for review.

## D6:14 · assistant · 2026-09-23T04:28:34.346Z

## Plan

I’ll keep this scoped to the Feature 6 follow-up in D6:

1. Inspect the committed pace implementation and test conventions.
2. Extract the production automatic-step eligibility condition into a small module used by `app.js`, then replace the test-local duplicate predicate with direct production tests.
3. Extend the controlled-clock tests to reseed a pending callback for every blocking/cancellation case and prove resume gets a full fresh delay.
4. Add a separate pace-save notice state/helper so unavailable preference storage still applies the page-local pace, shows a short notice, clears after a successful pace save, and never writes into hand/history notices.
5. Run all tests/syntax checks and a focused browser-asset smoke check, inspect the staged scope, update the Feature 6 review note while retaining In Progress/Pending, and create one scoped follow-up commit.

I’ll first gather the current committed implementation and confirm the worktree boundary so no unrelated evidence/data changes are touched.

## D6:15 · assistant · 2026-09-23T04:28:45.326Z

The gap is confirmed: `computer-scheduler.test.js` currently duplicates the app predicate. I’ll move the condition into the scheduler module as `canScheduleAutomaticComputerStep`, have `app.js` call it for both scheduling and callback revalidation, and test that exported function directly.

For the notice path, I’ll add a testable `applyComputerPaceChange` helper beside persistence. It will always return the normalized, page-applied pace; on save failure it returns a dedicated short notice and on success it returns an empty notice. `app.js` will render it in a new `#computer-pace-notice` element, separate from `#save-notice` and History notices. Because this changes browser-visible modules, I’ll consistently bump the asset graph to `v=7`.

## D6:16 · assistant · 2026-09-23T04:29:09.448Z

The production helper and page-local notice helper are now introduced. The next edit will wire them into the actual scheduling and change-handler paths, render the separate notice, and complete the `v=7` transitive module graph.

## D6:17 · assistant · 2026-09-23T04:29:39.169Z

I’ve wired the production helper into `app.js` for both timer creation and callback revalidation, and the notice has its own DOM target/state so it cannot overwrite save or history notices. I’ll now replace the duplicate-predicate test with direct production-helper coverage and add the required fresh-delay-after-resume regression, plus test the pace-change result helper’s failed-save then successful-save clearing behavior.

## D6:18 · assistant · 2026-09-23T04:29:53.051Z

The test-local eligibility expression has been removed. The test suite now imports the production `canScheduleAutomaticComputerStep` helper that `app.js` calls, verifies the two permitted state classes, and names every blocked condition. The cancellation test now schedules a brand-new pending callback before each blocked-state check, and a separate controlled-clock test proves resumed work waits the entire 800 ms rather than the remaining 300 ms.

I’ll run the full suite and syntax checks now, inspect all `v=7` module edges and focused diff, and correct anything surfaced before finalizing the review note and commit.

## D6:19 · assistant · 2026-09-23T04:30:06.481Z

Validation is green: **44/44 tests** and all syntax checks pass; the `v=7` asset graph is consistent and `git diff --check` is clean.

One small documentation adjustment remains: update Feature 6 evidence to reflect the new direct production-helper coverage, fresh-delay resume test, separate unsaved-pace notice, and 44-test total—while retaining **Status: In Progress** and **Approval: Pending**. Then I’ll perform an HTTP asset smoke check, review the final scoped file list, and commit only these follow-up files.

## D6:20 · assistant · 2026-09-23T04:30:19.298Z

The review evidence now accurately records the follow-up and remains explicitly **In Progress / Pending**. I’ll now do the final static/HTTP smoke checks, verify the intended diff and status, then stage only the Feature 6 follow-up paths and create the scoped commit.

## D6:21 · assistant · 2026-09-23T04:30:30.186Z

The HTTP smoke check passed. The repository-wide whitespace check is blocked only by pre-existing, unrelated trailing whitespace in `evidence/REVIEW.md`; I will leave that unrelated file untouched. The scoped Feature 6 whitespace check had already passed, and the final evidence correctly preserves the requested review state. I’ll now stage the 12 intended follow-up files, verify the staged diff is isolated from the existing unrelated worktree changes, and create the scoped follow-up commit.

## D6:22 · assistant · 2026-09-23T04:30:35.448Z

The scoped follow-up commit was created successfully as `569827b test: strengthen computer pace coverage`. Its staged file list contained only the 12 Feature 6 files; the remaining worktree modifications/untracked evidence are pre-existing and remain separate.

Final validation after committing passed again: **44/44 tests**, syntax checks, and the scoped commit whitespace check. I’ll make one final read-only confirmation of the commit, review status, and retained Feature 6 approval state.

## D6:23 · assistant · 2026-09-23T04:30:40.254Z

## Feature 6 follow-up completed

Created scoped follow-up commit:

- `569827b test: strengthen computer pace coverage`
- Preceded by Feature 6 implementation commit: `070267a feat: add computer pace setting`

### Changes made

- Extracted production eligibility helper:
  - `canScheduleAutomaticComputerStep(...)` in `projects/cedar-table/computer-scheduler.js`
  - `projects/cedar-table/app.js` uses it for both initial timer scheduling and callback revalidation.

- Strengthened scheduler coverage:
  - Directly tests the production helper.
  - Confirms automatic work is allowed only for claims and non-East discard turns.
  - Covers paused, hidden, Continue-gated, human-claim, East-discard, and ended blocking conditions.
  - Seeds a fresh pending callback before every blocked-state cancellation assertion.
  - Retains replacement and stale-callback tests.
  - Adds proof that cancellation followed by resume waits a full fresh delay, not the remaining time.

- Added testable pace-save result handling:
  - New `applyComputerPaceChange(...)` applies the normalized pace locally regardless of storage availability.
  - Failed persistence produces: “Computer pace will apply for this page, but could not be saved.”
  - A later successful save clears only this separate notice.

- Added separate UI notice:
  - `#computer-pace-notice` in `projects/cedar-table/index.html`
  - It does not overwrite hand-saving or History notices.

- Bumped the browser asset graph consistently from `?v=6` to `?v=7`.

- Updated `projects/cedar-table/evidence/FEATURE-6-READY-FOR-REVIEW.md`.
  - Feature remains **In Progress**.
  - Approval remains **Pending**.

### Validation

Passed after commit:

- `npm test` — **44/44 passing**
- `npm run check` — passed
- Scoped `git diff --check` — passed
- Local HTTP asset smoke check — passed, including `v=7` entry assets and new production helpers.

The existing unrelated modified/untracked evidence and `data/` files remain unstaged and were not included in the follow-up commit.
