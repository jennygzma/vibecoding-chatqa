# D2 — Save, pause, and continue a hand

Status: In Progress. Approval pending.

## D2:1 · user · 2026-09-22T23:14:16.344Z

For the second feature I want to leave a Cedar Table hand and come back to it. Please add automatic local saving and a Continue hand option after refreshing or reopening the game. Keep the four-seat rules and English interface from the first feature. Save after each move including computer moves. I should get the same tiles and the same pending claim when I continue. Show the last saved time and how long I have actually played this hand. Time while the game is closed or paused should not count. Add a Pause button so the table stops while I am away. A saved hand should wait for me to choose Continue before anything moves. Let me start a new hand instead with a clear confirmation. If saving is unavailable or an old save is damaged explain it and keep the game usable. Test restoration during a claim and after a finished hand. Please update the README and leave a separate Ready for Review note for feature 2 with the tests and a local commit. Keep it In Progress for my review.

## D2:2 · assistant · 2026-09-22T23:14:19.389Z

## Plan

I’ll first inspect the project structure, existing first-feature implementation, scripts, and repository state. Then I’ll identify the game-state and UI integration points for persistence, pause/timing, restoration, confirmation, tests, documentation, and review-note conventions. After that I’ll implement the feature consistently with the existing codebase, run the relevant automated checks (including the requested restoration scenarios), verify the edited files, create a local commit, and leave the feature marked **In Progress** with a separate Ready for Review note.

## D2:3 · assistant · 2026-09-22T23:14:23.383Z

The working tree already contains uncommitted evidence/data artifacts that predate this feature. I’ll preserve them and limit the feature commit to the application, tests, README, and the review note. Next I’m reading the complete current implementation and project scripts so persistence does not alter the four-seat claim model.

## D2:4 · assistant · 2026-09-22T23:14:38.013Z

## Implementation approach

- Add a dependency-free persistence module that serializes the existing complete game state (including physical tile IDs, melds, pending discard/claim, passed callers, and finish state) plus active-play timing metadata.
- Validate saved data before restoring it; corrupt, incompatible, or unavailable storage will display a plain-English notice and fall back to a usable new hand.
- Update the browser controller to save after every state transition—including timed computer transitions—track only active time, pause reliably, and defer all scheduled movement until the player explicitly chooses **Continue hand**.
- Add a confirmed **New hand** path that clears the saved hand, update the English UI/README, and write automated tests for claim/finished restoration and storage failures.
- Preserve the existing Feature 1 review content and add a separate Feature 2 review note, then commit only Feature 2 files.

## D2:5 · assistant · 2026-09-22T23:15:11.086Z

The first controller replacement exceeded the editor’s safe payload limit, so no file was changed. I’ll split the same complete replacement into smaller controlled edits, then immediately syntax-check it before proceeding with markup and tests.

## D2:6 · assistant · 2026-09-22T23:15:22.000Z

The split edit inserted the new controller footer at the transition boundary; I’m now checking the resulting file because this is exactly where an accidental retained legacy footer could cause duplicate initialization.

## D2:7 · assistant · 2026-09-22T23:15:29.972Z

The controller and persistence module now pass syntax validation. I’ll add the compact English controls/status area and automated persistence tests next, including an exact pending-claim round trip (same physical tile ID and claim decision) and a completed-hand round trip.

## D2:8 · assistant · 2026-09-22T23:15:49.372Z

The new test content was not written because the editor request omitted its target path. I’ll apply it to a dedicated persistence test file, then run the full checks to catch both test and integration issues.

## D2:9 · assistant · 2026-09-22T23:15:59.134Z

The pending-claim test exposed a test-fixture conservation error—not an application failure: the fixture replaced East’s dealt hand and dropped tiles, so the persistence validator correctly rejected it. I’ll correct the fixture to retain all 136 physical tiles, rerun the entire suite, and then inspect the diff before preparing the review handoff and commit.

## D2:10 · assistant · 2026-09-22T23:16:10.523Z

All automated tests now pass (15 total). The only diff-check warnings are pre-existing formatting in the already-modified Feature 1 review file plus one harmless final blank line in the new controller; I’ll remove the latter, create the separate Feature 2 review note marked **In Progress**, and then perform the final scoped validation and commit.

## D2:11 · assistant · 2026-09-22T23:16:19.750Z

The review note is separate from the Feature 1 document and keeps the requested status as **In Progress**. I’m replacing its temporary commit placeholder with a stable local-log reference, then I’ll verify the exact staged file set, run the final checks, and make a scoped Feature 2 commit without absorbing the pre-existing untracked evidence/data artifacts.

## D2:12 · assistant · 2026-09-22T23:16:25.002Z

Final scoped validation is clean: the requested persistence tests, all existing game/rule tests, and syntax checks pass. I will now stage only the eight Feature 2 files (explicitly excluding the pre-existing `evidence/REVIEW.md`, `data/`, and other evidence artifacts), create the local commit, then amend the review note with that exact commit ID and re-verify the committed contents.

## D2:13 · assistant · 2026-09-22T23:16:27.441Z

The scoped Feature 2 commit was created as `669a57b`. I’ll now record that immutable review revision in the separate note and amend it into the same local commit, then confirm the final commit contents and that the unrelated working-tree artifacts remain untouched.

## D2:14 · assistant · 2026-09-22T23:16:40.354Z

## Feature 2 complete — Ready for Review

Implemented automatic local hand saving and continuation while retaining the existing four-seat rules and English interface.

### Delivered
- Automatic `localStorage` save after every human and computer transition.
- Restores complete physical-tile state, including:
  - pending claims and the exact pending discard;
  - passed-player claim state;
  - exposed melds;
  - finished hands and winners.
- Restored hands wait for **Continue hand** before any computer action runs.
- **Pause/Resume** stops timed computer turns and excludes paused/closed time from active hand duration.
- Displays **Last saved** timestamp and **Played** active duration.
- **New hand** requires confirmation before replacing the saved hand.
- Graceful messages and usable fallback hand for blocked local storage or damaged saves.
- Updated README documentation.
- Added separate review handoff:
  - `projects/cedar-table/evidence/FEATURE-2-READY-FOR-REVIEW.md`
  - Status remains **In Progress**.

### Validation
- `npm test` — **15 passing**
  - Includes restoration during a pending human claim with the same physical discard ID.
  - Includes restoration after a finished hand.
  - Includes damaged-save and unavailable-storage handling.
- `npm run check` — passed.
- Local HTTP smoke check confirmed the Continue hand, Pause, and save-time controls.

### Local commit
- Current Feature 2 commit: `8192e07 feat: persist Cedar Table hands locally`

I intentionally left the pre-existing uncommitted `data/` and evidence artifacts, plus the existing modified `projects/cedar-table/evidence/REVIEW.md`, untouched and out of the Feature 2 commit.

## D2:15 · user · 2026-09-22T23:24:47.536Z

The refresh kept North's 6 Bamboo and my Pon choice correctly. But Played stayed at one minute while I was deciding and was still one minute after refreshing. Please keep the visible clock moving while I think and preserve that time when I leave the page. Stop counting after a hand finishes as well as while paused or hidden. Also hide or disable Continue hand when I am already playing. I checked damaged saves too. Changing a tile rank to 99 is accepted. So is setting awaitingHuman on an ordinary discard phase. Please validate the actual tile identities and consistent claim state before restoring. Reading window.localStorage itself can throw before the current catch block. That needs a safe fallback too. Please add coverage for the clock and page lifecycle as well as valid pending claims and real finished hands. Use a clock that does not jump when the system time changes. Keep the code readable and formatted. Once the checks pass update the feature 2 review note and make a new local checkpoint. I will review this before feature 3.

## D2:16 · assistant · 2026-09-22T23:24:51.515Z

## Plan

I’ll inspect the committed Feature 2 implementation and review note, then tighten persistence validation against the actual 136-tile identity set and game-phase invariants. I’ll replace the wall-clock-based active timer with a monotonic clock and add lifecycle handling so the visible clock updates while actively playing but freezes while paused, hidden, closed, or after a hand ends. I’ll also make **Continue hand** available only for a restored hand, extend tests for the requested cases, run all checks, update the Feature 2 review note, and create a new local checkpoint without including unrelated workspace artifacts.

## D2:17 · assistant · 2026-09-22T23:24:59.188Z

## Findings and refinement plan

The reported behavior matches the current implementation: it only re-renders after actions, derives elapsed time from `Date.now()`, and directly evaluates `window.localStorage` before the persistence helper can catch access errors. The current structural validator checks only uniqueness/count, not canonical tile identities or whether `awaitingHuman` represents the selected legal human claim.

I’ll address this with:
1. a small, injectable monotonic active-time utility for unit-tested ticking/pause/hidden/finished lifecycle behavior;
2. canonical identity and phase/claim validation in persistence;
3. safe storage acquisition in the UI;
4. a readable controller update that runs a visual clock while the table is active, saves on lifecycle suspension, and hides Continue except for restored hands.

## D2:18 · assistant · 2026-09-22T23:25:10.931Z

I’ll keep the timer logic isolated in a small `clock.js` module so its monotonic behavior and lifecycle stopping can be tested without a browser DOM. For restore validation, I’ll normalize the serialized state first, compare each tile against the canonical ID/type map, and then validate legal meld, phase, pending-discard, and selected-human-claim relationships before accepting it.

## D2:19 · assistant · 2026-09-22T23:25:37.424Z

The persistence replacement did not run because the editor request omitted its target path; no source changed in that step. I’ll apply the same validated-state update to the intended file now, then test it before touching the controller.

## D2:20 · assistant · 2026-09-22T23:25:56.299Z

The stricter persistence model is now in place. Next I’m replacing the compact controller with a formatted version that uses `performance.now()` through the tested clock module, safely obtains storage, continuously renders the active clock, and handles `visibilitychange`/`pagehide` transitions without advancing hidden or finished hands.

## D2:21 · assistant · 2026-09-22T23:26:06.125Z

The controller now uses a monotonic timer and lifecycle hooks. One compatibility detail surfaced during review: a legitimate tsumo finish does not move its winning tile out of the winner’s hand, so a finished-state validator must accept zero stored winning tiles (tsumo/exhaustive draw) as well as one (ron). I’ll adjust that invariant and add explicit regression tests for canonical identity corruption, ordinary-phase `awaitingHuman`, legal pending claims, and genuine finishes.

## D2:22 · assistant · 2026-09-22T23:26:15.021Z

The new tests now cover the reported rank-99 and invalid `awaitingHuman` cases, along with a valid ended tsumo state; the existing pending-claim test continues to exercise restoration and completion of a real legal Pon choice. I’ll run the expanded test suite and syntax checks now, then use any failures to refine the invariants before final review documentation and the checkpoint.

## D2:23 · assistant · 2026-09-22T23:26:20.943Z

The pending-claim regression failed because its test fixture still had `tsumoEligible: true`, a state that game transitions never produce once a discard opens a claim phase. The stricter validator correctly rejected it. I’ll correct the fixture to represent a real claim state and rerun all tests; I’ll also format the few long persistence expressions for the readability requirement.

## D2:24 · assistant · 2026-09-22T23:26:42.627Z

The full suite is now green (18 tests), including monotonic-clock lifecycle tests and the new corrupted-save cases. Before checkpointing, I’ll strengthen the finished-hand test to end through the real `tsumo` game transition rather than by assigning terminal fields, and format the persistence tests/validation branches for readability.

## D2:25 · assistant · 2026-09-22T23:26:50.717Z

The finished-hand coverage now performs an actual East tsumo before serializing, rather than fabricating terminal fields. I’ll run final validation and inspect the scoped diff; if green, I’ll update the Feature 2 note with this follow-up’s specific coverage and create the requested checkpoint commit.

## D2:26 · assistant · 2026-09-22T23:26:57.641Z

All final checks pass with **18 tests**. The added finished-hand case now reaches the terminal state through the actual game `tsumo` transition, and lifecycle-clock tests verify that time accumulates while active but not while stopped for hiding/page leave. I’ll update the existing Feature 2 review note to describe this follow-up checkpoint and its validation, then create the scoped local commit.

## D2:27 · assistant · 2026-09-22T23:27:06.851Z

The review note now records the timing/lifecycle correction, stricter restore checks, and expanded coverage while retaining **In Progress**. I’ll stage only this follow-up’s source, tests, README, and Feature 2 note—excluding all pre-existing artifacts—create the requested checkpoint, and run one final post-commit status check.

## D2:28 · assistant · 2026-09-22T23:27:12.049Z

## Feature 2 follow-up checkpoint complete

Created local checkpoint:

- `7b82723 fix: preserve active hand time and validate restores`

### Fixed timing and lifecycle behavior
- Added a monotonic active-time clock based on `performance.now()`.
- The visible **Played** clock updates while you are deciding, including at a pending claim.
- Active time is saved when the page is hidden or left.
- Time stops while:
  - paused;
  - hidden;
  - the page is being left;
  - the hand has finished.
- Restored active time resumes only after choosing **Continue hand**.

### Improved controls
- **Continue hand** is hidden during ordinary active play.
- It is shown only when a restored saved hand is awaiting the player’s explicit continuation.

### Hardened restore validation
Saved hands are now rejected when they contain:
- invalid tile identity data, including an ID/type mismatch or rank `99`;
- invalid meld shapes;
- inconsistent discard/claim phases;
- `awaitingHuman` during an ordinary discard phase;
- a pending human claim that is not actually the currently selected legal claim;
- invalid pending-discard ownership or inconsistent finished states.

Accessing `window.localStorage` is now itself protected, so blocked storage access falls back safely to a usable game.

### Tests and checks
- `npm test` — **18 passing**
  - monotonic active clock;
  - hidden/page-leave lifecycle stopping and resuming;
  - valid pending Pon restoration with the same physical discard;
  - real game-transition East tsumo finish restoration;
  - rank-99 rejection;
  - invalid `awaitingHuman` rejection;
  - damaged and unavailable storage handling.
- `npm run check` — passed.
- Local HTTP smoke check — passed.

### Documentation
Updated:
- `projects/cedar-table/README.md`
- `projects/cedar-table/evidence/FEATURE-2-READY-FOR-REVIEW.md`

Feature 2 remains **In Progress** for your review. Pre-existing uncommitted evidence/data artifacts were left untouched and excluded from the checkpoint.

## D2:29 · user · 2026-09-22T23:31:23.037Z

The clock now advances while I decide and stays fixed when paused. Leaving and reopening the page kept one minute and twelve seconds without adding the time away. I found one remaining save boundary issue. A legal ron opportunity is rejected if the discard has happened but resolveClaims has not run yet. After resolveClaims the same position restores successfully. My fixture gives East 1 and 2 Bamboo plus 1-2-3 Characters and 1-2-3 Dots with three East winds and two White dragons. North has just discarded 3 Bamboo. All 136 physical tiles are present and unique. Since each discard is saved immediately this is a real refresh window. Please accept this valid intermediate state and resolve it only after Continue. Add a regression for it plus save/restore checks throughout complete hands. Format the persistence files and tests too. Then update the review note and checkpoint.

## D2:30 · assistant · 2026-09-22T23:31:27.561Z

## Plan

I’ll inspect the current claim-selection and persistence validation paths, reproduce the described pre-`resolveClaims` Ron state using the existing test helpers, and adjust validation so a legal unresolved claim window is accepted without allowing inconsistent pending states. I’ll add a regression for that exact state plus save/restore round trips throughout complete simulated hands, format the persistence source/tests for readability, run all checks, update the Feature 2 review note, and create a scoped local checkpoint.

## D2:31 · assistant · 2026-09-22T23:31:41.303Z

The failure is in the final claim-phase invariant: it treats `awaitingHuman: false` as proof that East cannot have the selected Ron. Immediately after a discard, however, that flag is correctly still false until `resolveClaims` runs. I’ll make the invariant distinguish “unresolved claim window” from an invalid awaiting state, add the specified 3 Bamboo Ron fixture, and add restore round trips after every transition in deterministic full-hand simulations.

## D2:32 · assistant · 2026-09-22T23:32:19.061Z

I’ll now apply the narrow persistence change and test coverage. The restored intermediate record will retain `awaitingHuman: false`; the existing app-level `waitingToContinue` gate prevents its claim resolution until the user presses **Continue hand**.

## D2:33 · assistant · 2026-09-22T23:32:25.474Z

The full-file formatting replacement exceeded the editor payload limit, so no files were changed by that attempt. I’ll make equivalent, smaller edits: first the logic correction, then compactly add the regression and transition round-trip test, followed by a formatter-style cleanup of the affected sections.

## D2:34 · assistant · 2026-09-22T23:32:39.579Z

The exact Ron fixture is now represented with North’s physical 3 Bamboo still in North’s discard pile and all 136 IDs conserved. Next I’ll add the complete-hand round-trip regression, convert the existing persistence test records to the shared formatted helper, and update the review record once the suite confirms the behavior.

## D2:35 · assistant · 2026-09-22T23:32:50.137Z

The new simulation restores every state transition—including unresolved discard/claim windows, pending human decisions, computer calls, and terminal states—before continuing the hand. I’ll run it now along with syntax validation and inspect the edited files/diff before recording the updated review evidence and checkpoint.

## D2:36 · assistant · 2026-09-22T23:33:03.670Z

All 20 tests pass, including the new unresolved-Ron and full-hand persistence coverage. The only `git diff --check` issue belongs to the pre-existing, unrelated modification of `projects/cedar-table/evidence/REVIEW.md`; I will leave it untouched. I’ll now finish formatting the touched persistence source and test blocks and record the new coverage in the Feature 2 review note.

## D2:37 · assistant · 2026-09-22T23:33:20.394Z

Formatting is now improved in both persistence files, and the review note reflects the accepted intermediate window and expanded test coverage. I’ll perform the final targeted validation (excluding the unrelated modified review file), inspect the staged scope, then create and verify the requested checkpoint.

## D2:38 · assistant · 2026-09-22T23:33:24.667Z

Targeted validation is clean: `npm test` passes all 20 tests, `npm run check` passes, and whitespace validation passes for the three scoped files. The review note has been updated and still correctly remains pending approval. I’ll create a checkpoint containing only the Feature 2 persistence changes, deliberately excluding the pre-existing review edit and untracked data/evidence artifacts.

## D2:39 · assistant · 2026-09-22T23:33:27.530Z

The scoped checkpoint was created as `b66173d`. I’ll make one final post-commit verification of the committed files and confirm the remaining working-tree items are unrelated pre-existing artifacts.

## D2:40 · assistant · 2026-09-22T23:33:31.926Z

## Completed: unresolved Ron restore boundary

Created checkpoint:

- `b66173d fix: restore unresolved claim windows`

### Changes made

- Updated `projects/cedar-table/persistence.js`
  - Accepts a valid `phase: "claim"` state immediately after a discard, before `resolveClaims()` has run.
  - Retains strict validation for `awaitingHuman: true`: it must still correspond to East’s actually selected legal claim.
  - The app’s existing restored-hand gate continues to prevent automatic resolution until **Continue hand** is pressed.
  - Formatted the persistence validation logic.

- Updated `projects/cedar-table/persistence.test.js`
  - Added the reported fixture:
    - East has 1–2 Bamboo, 1–2–3 Characters, 1–2–3 Dots, East triplet, White pair.
    - North has discarded 3 Bamboo.
    - The saved state is pre-`resolveClaims`, preserves all 136 unique physical tiles, restores successfully, and only exposes/completes Ron after resolution.
  - Added deterministic complete-hand tests that serialize and restore after **every transition** before continuing.
  - Formatted persistence test helpers and storage mocks.

- Updated `projects/cedar-table/evidence/FEATURE-2-READY-FOR-REVIEW.md`
  - Documents the accepted immediate-post-discard claim window.
  - Records the new Ron regression and complete-hand round-trip coverage.
  - Updates validation count to 20 tests.

### Validation

Passed after commit:

```sh
npm test
npm run check
```

Results: **20 tests passed**, syntax checks passed, and the scoped commit has no whitespace errors.

### Working tree note

I intentionally did not include the pre-existing unrelated modification to:

- `projects/cedar-table/evidence/REVIEW.md`

Nor the pre-existing untracked `data/` and evidence artifacts.
