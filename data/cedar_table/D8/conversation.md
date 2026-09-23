# D8 — Select and confirm an East discard

Status: In Progress. Approval pending.

## D8:1 · user · 2026-09-23T05:20:37.499Z

For feature 8, add a deliberate select-then-confirm discard flow for East. A single click on my hand currently discards immediately; I want to inspect the tile before committing it. Keep the interface in English. Clicking a hand tile should select that exact physical tile, visibly highlight it and expose its pressed state for accessibility, then show Selected: <tile name> with Confirm discard and Cancel beside the hand. Clicking another tile changes the choice; clicking the same tile again just keeps it selected. Only Confirm discard should move the tile into East's river. Cancel clears the choice without changing the hand. Do not add a modal, timer, or auto-confirm.

Only allow selection and confirmation during East's active legal discard turn. Track the physical ID rather than a stale array index, and revalidate the current turn and tile before confirming. Two rapid confirmations must not produce two discards. This selection is temporary UI state, never part of the saved game or a new storage preference. Clear it on a real game action or turn change, Pause, hidden page, page exit/reload, Continue, restart, and hand end. Ordinary rerenders from Analyze hand or a pace change should preserve a still-valid selection, and simply selecting/canceling should not remove valid practice hints. Thinking time should keep contributing to Played, while the existing pause/hidden/finished exclusions remain.

Keep keyboard access through the existing tile buttons and ordinary confirm/cancel buttons, with a clear focus indication. Update the hand help text to describe the two steps. Preserve all seven previous features, including the public discard rivers and their read-only tiles. Start from the 49 passing tests and use meaningful tests against the production selection/confirmation logic for duplicate faces, stale IDs, changing turn, cancellation, lifecycle clearing, and confirmation at most once. Bump the complete browser asset graph consistently from v=9. Make a scoped local commit, leave existing evidence/data edits alone, and add evidence/FEATURE-8-READY-FOR-REVIEW.md with Ready for Review for @Andy Chen. Keep In Progress and approval pending. Only feature 8 belongs in this conversation; I will inspect the result.

## D8:2 · assistant · 2026-09-23T05:20:42.976Z

## Plan

I’ll implement Feature 8 as a scoped change only. I’ll first inspect the repository structure, test setup, current game/turn/discard logic, browser asset version references, and git status so I can preserve the existing seven features and avoid touching unrelated evidence/data work. Then I’ll:

1. Add temporary physical-tile-ID selection state and accessible selected UI.
2. Gate selection/confirmation to East’s active legal discard turn and revalidate on confirmation.
3. Clear selection at each required lifecycle/game boundary while preserving it across ordinary analysis/pace rerenders when still valid.
4. Update help text and add focused production-logic tests for the requested edge cases.
5. Bump browser assets consistently to `v=9`, add the requested Feature 8 review evidence file, run the full test suite, inspect the diff, and create a scoped local commit without including existing unrelated changes.



## D8:3 · assistant · 2026-09-23T05:20:48.128Z

The working tree has substantial pre-existing evidence and `data/` changes; I will leave all of those untouched and stage only Feature 8 files. The checked-in application already references `v=9`, so I’ll verify the complete current dependency graph rather than mechanically changing it further. Next I’m reading the production UI, game transition API, lifecycle handlers, markup/styles, and current test conventions to locate the narrowest implementation seam.

## D8:4 · assistant · 2026-09-23T05:20:54.229Z

## Implementation design

The game engine currently discards by array index, while each tile already has a unique physical `id`. To prevent stale-index and duplicate-face errors without putting UI state into persistence, I’ll add a small production module (`discard-selection.js`) that owns only the transient selected ID and exposes:

- legality/validity checks based on East’s current discard turn plus physical ID membership;
- selection, cancellation, lifecycle clearing, and exactly-once confirmation consumption;
- confirmation returning the *current* matching index only after revalidation.

`app.js` will use this module immediately before its existing engine `discard` call, clear temporary selection around genuine game transitions/lifecycle events, and leave analysis/pace rerenders alone. I’ll add a local confirmation control region beside the hand, selected/pressed tile semantics, and focus-visible styling. Tests will target this actual selection module and run alongside the existing suite.

## D8:5 · assistant · 2026-09-23T05:21:10.431Z

I’ve confirmed the selected tile ID will never enter `state` or persistence: saved game serialization remains unchanged. The active clock already runs whenever the hand is visible, unpaused, and not awaiting Continue, so deliberation time naturally remains in Played time. I’m now applying the scoped module/UI/test changes, including lifecycle clearing and `v=9` imports for the new browser module.

## D8:6 · assistant · 2026-09-23T05:21:46.136Z

The initial edits establish the transient ID-based controller and accessible visual state. I spotted one follow-up compatibility adjustment needed because the old tile renderer accepted an index argument; I’ll update that call site while adding the confirmation rendering and all required clear paths.

## D8:7 · assistant · 2026-09-23T05:22:24.081Z

The confirmation UI is now rendered only for a still-valid, runnable East selection and confirmation resolves the current index from the physical ID immediately before invoking the existing discard engine. I’m adding the focused tests next, including duplicate matching faces, stale IDs, turn changes, cancellation, ordinary valid selection retention, lifecycle clearing, and double-confirm protection.

## D8:8 · assistant · 2026-09-23T05:22:35.850Z

The focused production controller tests are in place. One semantic detail is intentional: selection/cancel do not call `act`, so they neither save nor clear practice hints; only a confirmed game transition does. I’ll now run the complete test and syntax checks, inspect the rendered-source changes and version graph, then add the requested review evidence and make a scoped commit if validation is clean.

## D8:9 · assistant · 2026-09-23T05:22:51.294Z

Validation is clean: **54/54 tests pass** (the prior 49 plus five Feature 8 controller tests) and syntax checks pass. The asset graph—including the new selection module edge—is consistently `?v=9`. I’m strengthening the at-most-once test to exercise the real game discard transition, then I’ll write the requested Ready for Review document, rerun validation, review staged scope, and commit only the Feature 8 files.

## D8:10 · assistant · 2026-09-23T05:23:05.306Z

I found one deployment requirement that needs a final correction: the repository’s baseline asset graph is already `v=9`, and Feature 8 is browser-visible, so its graph must advance **from `v=9` to `v=10`** rather than remain at `v=9`. I’ll update every tracked local browser edge and the revision documentation together, adjust the Feature 8 evidence accordingly, then run final checks and commit the scoped files only.

## D8:11 · assistant · 2026-09-23T05:23:12.882Z

The complete browser graph is now consistently bumped from `v=9` to **`v=10`**, including the new local module edge and README deployment note. I’m performing final validation and a scoped staging review now; pre-existing modified/untracked evidence and `data/` content will not be added.

## D8:12 · assistant · 2026-09-23T05:23:18.504Z

Final validation passed: **54/54 tests**, syntax checks, and the scoped whitespace check. The staged scope will include only the Feature 8 implementation, its test, the necessary `v=10` asset-graph references, README revision note, and the new review file; all pre-existing evidence/data edits remain unstaged.

## D8:13 · assistant · 2026-09-23T05:23:22.699Z

The scoped local commit was created as `8e391dd feat: confirm East discards`. I’m doing one final post-commit inspection to verify its exact file list and confirm that only the known pre-existing evidence/data changes remain in the working tree.

## D8:14 · assistant · 2026-09-23T05:23:27.554Z

## Feature 8 complete

Created scoped local commit:

- `8e391dd feat: confirm East discards`

### Implemented
- East hand clicks now select, rather than immediately discard.
- Selection tracks the exact physical tile `id`, supports duplicate faces correctly, and exposes:
  - visible highlighted tile
  - `aria-pressed="true"`
  - `Selected: <tile name>`
  - **Confirm discard** and **Cancel**
- Confirm revalidates the active legal East discard turn and selected physical ID immediately before using the existing discard transition.
- Rapid/double confirmation is consumed at most once.
- Selection clears for game actions/turn changes, Pause, visibility/page-hide lifecycle events, Continue, restart, restore/reload, and hand completion.
- Analyze hand and computer pace rerenders preserve valid selection; select/cancel do not clear practice hints.
- Existing Played clock behavior remains unchanged, so deliberation time counts while pause/hidden/finished exclusions remain.
- Public discard rivers remain read-only.
- Added keyboard-visible focus styling and two-step hand help.
- Browser asset graph was consistently advanced from `v=9` to `v=10`, including the new local module edge.

### Tests and checks
- `npm test` — **54/54 passing**
- `npm run check` — passing
- Scoped `git diff --check` — passing

### Evidence
Added:

- `projects/cedar-table/evidence/FEATURE-8-READY-FOR-REVIEW.md`

It marks Feature 8 **Ready for Review** for **@Andy Chen**, while retaining **In Progress** status and **Pending** approval.

Pre-existing evidence and `data/` edits were left unstaged and untouched.

## D8:15 · user · 2026-09-23T05:26:07.639Z

I tried the new flow on the saved hand. After taking the offered Pon of 8 Bamboo, East had 11 concealed tiles, the wall stayed at 72, and the rivers were 3/3/3/2. Selecting the first East wind marked east-0; clicking it again kept it selected, and choosing the second marked east-2 instead. None of those clicks moved a tile. Analyze hand and changing Slow to Normal kept east-2 selected and the practice-hint text visible. Cancel cleared the choice without clearing the hints.

Thinking time advanced from 9:56 to 10:15 during the selection checks. Pause cleared both selection and hints, and Played stayed at 10:45 during the paused check. After Resume, selecting a tile and reloading brought back Continue with the same 11 physical hand IDs, no selection, and Normal still selected. The initial 54 tests and syntax checks passed again.

Two coverage/guard details need tightening before I confirm a discard. The selection module currently validates phase, turn, and membership, but it has no activity-gate input, and the tile/Confirm click callbacks do not recheck canRun at activation. Please make the actual selection and confirm paths explicitly reject a false current activity gate, with production-helper tests; do not rely only on hiding or disabling controls. This is a code-review gap, not a browser failure I reproduced.

Also, the at-most-once test calls discard before the second confirm, so the engine's changed phase can mask a controller that would return a second index. Add an unchanged-state double-consume assertion, retaining the real transition assertion. Add a reorder case that selects an ID, reorders the hand, and proves confirmation returns that ID's new index. The existing lifecycle test only repeats cancel, so name that test to describe what it actually proves rather than implying it drives the application's lifecycle events. Keep the UI behavior I checked, rerun validation, bump the full browser revision for the fix, and make a scoped follow-up commit. Keep In Progress and review pending.

## D8:16 · assistant · 2026-09-23T05:26:15.392Z

## Plan

I’ll make this narrowly as a Feature 8 hardening follow-up, preserving the browser behavior you verified. I’ll inspect the committed selection controller/tests and current asset revision first, then:

1. Pass an explicit current activity gate into production selection and confirmation paths, and reject false gates at activation rather than relying on rendered controls.
2. Add production-helper tests for activity-gate rejection, unchanged-state double consume, and ID-based reordered-index confirmation; rename the misleading lifecycle test.
3. Bump the entire browser asset graph consistently from its current revision, update Feature 8 review evidence while retaining **In Progress** and **Pending**, run all validation, and create a scoped follow-up commit only.



## D8:17 · assistant · 2026-09-23T05:26:30.620Z

The review identifies the exact gap: UI rendering disables/hides controls, but the production event handlers and controller API did not receive a current `canRun()` result. I’ll make the controller’s legal-discard predicate require an explicit activity value, pass a fresh `canRun()` result from both click paths, and test false-gate behavior directly. I’ll also add the requested reordered-hand and unchanged-state double-consume assertions, while keeping the real engine-transition assertion.

## D8:18 · assistant · 2026-09-23T05:27:10.770Z

I’ve wired fresh activity checks through both production callbacks and the stateful helper. Next I’ll replace the focused test file so every activation supplies the explicit active gate and covers the requested conditions without weakening the existing real-discard integration proof. Then I’ll revise all versioned local asset edges and the review evidence together.

## D8:19 · assistant · 2026-09-23T05:27:20.219Z

The bulk revision command correctly stopped because `discard-rivers.js` is a leaf module and therefore has no versioned local import to change. Its already-updated import edge in `app.js` is the graph revision point. The command had already advanced the actual versioned files before reaching that leaf; I’ll now verify every revision edge, update the documentation/evidence wording and test count, then run the full suite.

## D8:20 · assistant · 2026-09-23T05:27:30.751Z

The graph inspection confirms every actual browser asset edge is now `v=11`; I also found the deployment instruction text still mentioned `v=10`, so I’ll align that documentation value. I’ll then run the complete test and syntax commands in parallel with scoped diff/revision checks, inspect the resulting diff, and commit only the Feature 8 follow-up files.

## D8:21 · assistant · 2026-09-23T05:27:37.156Z

Validation passes: **56/56 tests** and all syntax checks. The revision check confirms every browser-reachable local asset edge is `v=11`, with no stale `v=10` values in the deployment files. I’ll perform one final scoped diff/status review, stage only the hardening files (leaving unrelated evidence/data untouched), commit the follow-up, and verify the commit’s contents and remaining worktree state.

## D8:22 · assistant · 2026-09-23T05:27:41.179Z

The final inspection confirms the handlers pass `canRun()` at event activation and the helper rejects inactive selection/confirmation. Tests specifically now verify unchanged-state double consumption returns `-1` before any game transition, then retain the real transition assertion. The lifecycle-named test has been corrected to describe cancellation and ordinary reads only. I’ll create the scoped follow-up commit now and inspect it plus the unstaged unrelated changes afterward.

## D8:23 · assistant · 2026-09-23T05:27:45.893Z

## Feature 8 hardening follow-up complete

Created scoped local commit:

- `568c0f7 fix: harden East discard confirmation gate`

### Tightened safeguards
- Production tile-click and Confirm-click callbacks now pass a fresh `canRun()` activity result at activation.
- `discard-selection.js` explicitly rejects both selection and confirmation when that current activity gate is false.
- This is enforced in selection/confirmation logic, not merely through hidden or disabled controls.

### Test coverage updated
Added/strengthened production-helper tests for:

- Activity-gate rejection for both selection and confirmation.
- Selecting an ID, reordering the hand, then resolving that physical tile’s new current index.
- Double confirmation against unchanged state: first returns the index, second returns `-1` before any discard transition.
- Retained the real game-transition assertion after the initial confirmation.
- Renamed the former lifecycle-implying test to accurately describe cancel behavior and ordinary read preservation.

### Revision and evidence
- Bumped the complete browser asset graph from `v=10` to `v=11`.
- Updated `projects/cedar-table/evidence/FEATURE-8-READY-FOR-REVIEW.md`.
- Evidence remains:
  - **Status: In Progress**
  - **Approval: Pending**
  - **Reviewer: @Andy Chen**

### Validation
- `npm test` — **56/56 passing**
- `npm run check` — passing
- Scoped diff checks — passing
- Verified all browser-reachable local asset URLs use `?v=11`.

Existing unrelated evidence and `data/` edits remain unstaged and untouched.

## D8:24 · user · 2026-09-23T05:30:11.749Z

The final browser check passed on the updated revision. I selected east-2 again, ran Analyze hand, and returned Computer pace to Slow; the selected tile and hint panel survived those rerenders. Confirm discard moved only east-2 into East's river exactly once, while east-0 stayed in my hand. East's concealed count changed from 11 to 10, and its river count from 3 to 4. I paused before the next computer step: the wall remained at 72, Played was 11:05, the choice/confirmation controls were gone, and stale hints were cleared. History/statistics still showed no completed hand.

Reloading preserved those exact ten hand IDs and the river IDs, with no pending selection and Played still 11:05. There were no browser errors. The full 56 tests, syntax checks, and scoped commit checks passed. The final screenshots and results are in evidence/feature-8/selected-east-final.png, confirmed-discard.png, browser-checks.json, tests.txt, and syntax-check.txt.

Please append this evidence and the earlier selection/Cancel/Pause/reload observations to the Feature 8 review note, then make a documentation-only commit for that note. Distinguish the checks accurately: visible controls and accessible pressed state were checked in the browser; keyboard focus styling/native-button semantics and hidden-page clearing were reviewed in source, without claiming a separate keyboard or hidden-tab interaction test. Keep Ready for Review for @Andy Chen, In Progress, and approval pending. No feature 9 work yet.

## D8:25 · assistant · 2026-09-23T05:30:16.402Z

## Plan

I’ll make a documentation-only Feature 8 evidence update. I’ll first inspect the current review note and repository status so the new browser/source-review results are appended accurately and no existing unrelated evidence/data changes are included. Then I’ll update only the Feature 8 note, verify its status/reviewer/approval wording and diff, and create a scoped documentation-only commit.

## D8:26 · assistant · 2026-09-23T05:30:25.034Z

The Feature 8 note already has the required review status, and the cited final artifacts are present but intentionally remain untracked evidence, so I will not stage them. I’ll append a clearly separated browser-observation/source-review record to the tracked note, including the earlier Pon/selection/Cancel/Pause/reload observations and the final `east-2` confirmation results. It will explicitly limit keyboard and hidden-page statements to source review.

## D8:27 · assistant · 2026-09-23T05:30:30.027Z

The review note now records the requested evidence with its testing scope explicitly qualified. I’ll verify the exact rendered note and documentation-only diff, ensure the required status remains unchanged, then stage and commit that one tracked file only.

## D8:28 · assistant · 2026-09-23T05:30:33.169Z

The documentation diff is limited to the Feature 8 review note and accurately separates browser-verified behavior from source-only review. The note still says **Ready for Review — @Andy Chen**, **In Progress**, and **Pending**. I’ll make the requested documentation-only commit now, then verify that commit contains only this note and that unrelated evidence/data remains untouched.

## D8:29 · assistant · 2026-09-23T05:30:38.728Z

## Documentation-only Feature 8 review update complete

Created scoped local commit:

- `5f5482f docs: record feature 8 browser review`

Updated only:

- `projects/cedar-table/evidence/FEATURE-8-READY-FOR-REVIEW.md`

### Recorded evidence
- Earlier saved-hand selection, reselection, Cancel, Analyze hand, pace-change, Pause, Resume, and reload observations.
- Final `v=11` browser check:
  - `east-2` alone discarded exactly once.
  - `east-0` remained in hand.
  - Concealed count changed 11 → 10; East river count 3 → 4.
  - Pause/reload preservation and clearing behavior.
  - No completed hand and no browser errors.
- References to the supplied Feature 8 screenshots, JSON, test, and syntax artifacts.

### Scope stated accurately
- Browser-checked: visible controls and accessible pressed state.
- Source-reviewed only: keyboard focus/native-button semantics and hidden-page clearing.
- The note explicitly does **not** claim separate keyboard or hidden-tab browser interaction tests.

The note remains **Ready for Review** for **@Andy Chen**, with **Status: In Progress** and **Approval: Pending**.

The commit contains only that documentation file; existing unrelated evidence and `data/` edits remain unstaged and untouched.
