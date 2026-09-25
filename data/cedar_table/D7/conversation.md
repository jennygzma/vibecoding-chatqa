# D7 — Four-seat public discard rivers

Status: In Progress. Approval pending.

## D7:1 · user · 2026-09-23T05:02:27.835Z

For feature 7, I want to see all four players' public discard rivers. The center only shows the current discard, so I lose track of earlier tiles when using Analyze hand. Add a compact Discards section near the table, with East, South, West, and North clearly labeled, each river in oldest-to-newest order and a remaining-tile count. Keep the interface in English and make the layout wrap on narrow screens. Empty rivers should say No discards yet. These are display tiles, not discard buttons.

Use the existing state's discards as the source of truth; do not create another saved history or reveal opponents' concealed hands. Highlight the current claimable discard with a text label as well as color, but only when its exact physical ID is still in that seat's river. Once a tile is taken for chii, pon, kan, or Ron it should disappear from the river and remain in its proper meld or winning-tile location. Do not pretend these remaining rivers are a complete replay log. I want them visible while paused, before Continue, and after a hand ends, and restored from the existing saved hand. Keep the clock, pace selection, hints, statistics, and history working as before.

Please implement only this feature in this conversation. Start from the current 44 passing tests. Add useful coverage of the real discard/claim transitions, duplicate tile faces with different physical IDs, save/restore, and no mutation or concealed-information leakage. Use a consistent next asset revision so an already-open page can reload safely. Run the tests and syntax checks, make a scoped local commit, and leave unrelated evidence/data changes alone. Add evidence/FEATURE-7-READY-FOR-REVIEW.md with a Ready for Review comment for @Andy Chen, keeping In Progress and approval pending. I will inspect the page before we move on.

## D7:2 · assistant · 2026-09-23T05:02:33.057Z

## Plan

I’ll implement Feature 7 only, preserving the existing game state as the single discard-history source. I’ll first inspect the project structure, current discard/claim/save UI and tests, the asset revision mechanism, and repository status. Then I’ll make the smallest aligned changes to render read-only, responsive four-seat discard rivers with claim highlighting and remaining count; add targeted transition, duplicate-ID, persistence, and leakage/mutation tests; run the project’s test and syntax checks; create the requested evidence note; and commit only the scoped feature files while leaving unrelated changes untouched.

## D7:3 · assistant · 2026-09-23T05:02:37.618Z

The repository already has unrelated modified/untracked evidence and data; I will not stage or alter those. The application is a dependency-free browser module app with asset revision `v=7`, so this feature will require a coordinated revision bump across the module graph and stylesheet reference. I’m now reading the relevant source and test contracts in full before choosing the minimal rendering/test seams.

## D7:4 · assistant · 2026-09-23T05:02:45.464Z

## Implementation plan refined

The game already removes a claimed discard from `state.discards` and transfers that exact object into the meld or `winningTiles`; persistence already serializes/restores physical IDs. I’ll keep those transitions unchanged. To make the display behavior directly testable without introducing saved state, I’ll add a small pure `discard-rivers.js` projection that:

- reads only `state.discards`, `state.lastDiscard`, and `state.wall.length`;
- exposes rivers in East/South/West/North order, preserves array order (oldest to newest), and marks a claimable tile only if its physical `id` remains in that seat’s river;
- never includes any hand data and never mutates state.

`app.js` will use that projection to render static `<div>` display tiles (not buttons), a clear English claim label, and the existing wall’s remaining count. The compact section will be placed immediately after the table and will flex-wrap on narrow screens. I’ll add test coverage around real discard/claim transitions, same-face distinct IDs, round-trip save restore, and projection non-mutation/no concealed-hand references.

## D7:5 · assistant · 2026-09-23T05:03:01.949Z

I have confirmed the existing state invariant makes `lastDiscard` valid only when it is exactly the final tile in that player’s river, and all claim paths remove it before placing the same physical ID elsewhere. The implementation will rely on that invariant rather than duplicate state or infer history.

## D7:6 · assistant · 2026-09-23T05:03:44.638Z

The initial scoped edits established the new pure projection, HTML container, and consistent `v=8` module graph. Next I’ll wire the projection into rendering, add responsive compact styles, and add focused node tests before running the suite.

## D7:7 · assistant · 2026-09-23T05:04:04.535Z

Two parallel CSS edit requests were rejected because their file path was omitted; no stylesheet state changed in those rejected operations. I also found the initial restore test attempted an illegal self-claim, so I’ll correct it to a real persisted South-to-East Pon transition.

## D7:8 · assistant · 2026-09-23T05:04:19.738Z

The implementation and targeted coverage are now in place. I’ll run the full test suite and syntax check, inspect the changed files and module graph, then fix any feedback before creating the requested evidence note and scoped commit.

## D7:9 · assistant · 2026-09-23T05:04:32.844Z

Validation is green at **47 tests** and syntax checks. The only full-repository whitespace warning is in pre-existing unrelated `evidence/REVIEW.md`; I will leave it untouched and run scoped whitespace validation for Feature 7 files. I also spotted a narrow-screen cascade issue where the existing generic mobile tile rule would override the river tile size, so I’ll add a specific compact override. Finally, I’ll expand transition coverage to explicitly verify Chii, Kan, and Ron river removal and destination placement.

## D7:10 · assistant · 2026-09-23T05:04:46.224Z

The new transition test needs one seat-order correction: East can only Chii North’s discard, whereas Pon/Kan/Ron can use South’s. I’ll encode that real arbitration condition, then perform the final validation, create the requested review evidence, and commit only the Feature 7 files.

## D7:11 · assistant · 2026-09-23T05:05:01.452Z

The real-transition test now matches legal seat order. I’ll run the complete validation one final time, verify only scoped files are whitespace-clean and staged, write the Feature 7 review note with the requested status, and make the local commit.

## D7:12 · assistant · 2026-09-23T05:05:08.672Z

The failed check correctly identified invalid Ron test data: the claimed North completed only a pair while leaving an incomplete Bamboo run. I’ll replace the offered tile with Bamboo 3 so the real claim completes the standard hand, then rerun all checks before documenting and committing.

## D7:13 · assistant · 2026-09-23T05:05:16.702Z

The Ron fixture now completes its Bamboo 1–2–3 meld while retaining North as the pair. I’ll perform the final test/syntax/whitespace verification, then add the requested evidence file and commit the scoped implementation.

## D7:14 · assistant · 2026-09-23T05:05:24.892Z

All final checks now pass: **48/48 tests**, syntax checks, scoped whitespace validation, and no stale `v=7` asset references in application sources. I’ll now add the requested Feature 7 evidence note, stage only the implementation/test/documentation files for this feature (not the pre-existing evidence/data worktree changes), create the scoped local commit, and verify its contents and remaining worktree status.

## D7:15 · assistant · 2026-09-23T05:05:30.730Z

The requested evidence note has been added with Ready for Review addressed to @Andy Chen while retaining In Progress and Pending approval. I’ll now stage the exact Feature 7 file set, inspect the staged diff, commit it, and confirm unrelated modifications remain unstaged.

## D7:16 · assistant · 2026-09-23T05:05:34.075Z

The staged diff contains exactly the 11 Feature 7 implementation, tests, asset-revision, README, and new evidence files; the previously modified evidence files and untracked data remain unstaged. I’ll create the scoped commit and verify the resulting commit and worktree separation.

## D7:17 · assistant · 2026-09-23T05:05:40.196Z

Implemented Feature 7 and created scoped local commit:

- **Commit:** `ba98c98 feat: show public discard rivers`

### Delivered
- Compact **Discards** section below the table with labeled **East, South, West, North** public rivers.
- Tiles display in existing discard-array order: **oldest to newest**.
- Empty rivers display **“No discards yet.”**
- Shows current wall **tiles remaining**.
- Rivers are read-only display tiles, not buttons.
- Current claimable discard has both a visual highlight and **“Current claimable”** text, only when its exact physical ID is still present in that river.
- Uses only existing `state.discards`, `state.lastDiscard`, and wall state—no extra history and no opponent concealed-hand access.
- Existing claim transitions remain authoritative: claimed Chii/Pon/Kan/Ron tiles disappear from rivers and remain in melds or winning-tile storage.
- Visible during paused, saved-before-Continue, restored, and ended states because it renders with the existing table state.
- Responsive flex-wrap layout for narrow screens.
- Bumped the complete browser asset graph consistently from `?v=7` to **`?v=8`**.

### Coverage and validation
- Added `discard-rivers.test.js` covering:
  - ordered four-seat projection;
  - exact physical IDs for duplicate tile faces;
  - no mutation and no concealed-information leakage;
  - save/restore;
  - actual Chii, Pon, Kan, and Ron river-removal transitions.
- `npm test` — **48/48 passing**
- `npm run check` — passing
- Scoped whitespace validation passes.

### Review evidence
Added:

- `projects/cedar-table/evidence/FEATURE-7-READY-FOR-REVIEW.md`

It includes the requested Ready for Review comment for **@Andy Chen**, while keeping status **In Progress** and approval **Pending**.

Pre-existing unrelated evidence and data changes were left unstaged and untouched.

## D7:18 · user · 2026-09-23T05:07:10.756Z

I reloaded the existing localhost page and inspected the saved hand before Continue. Played stayed at 5:16, with 74 tiles left in the wall and Slow still selected. The river contents are East: West, North, Green; South: 1, 3, 5 Bamboo; West: two separate 2 Bamboo; North: 1 and 2 Characters. South's 5 Bamboo is the current offered tile, and there are no page errors.

Three visible issues need fixing in this same feature. I meant a count for each river, not a repeat of the wall count: please label these East 3, South 3, West 2, North 2, with clear wording that these are tiles still in the river. The tiles also render at 64 by 88 pixels, not the compact river size. Their computed shadow is the ordinary 2px 3px shadow even on the current discard; the later generic .tile and suit rules are overriding the river size and highlight. Finally, Current claimable is a separate flex item and has wrapped below the left edge of South's river, away from the actual 5 Bamboo. Keep that text physically attached to its highlighted tile when wrapping.

Please correct the styles with enough specificity at both desktop and narrow widths, add the per-seat counts, and keep normal hand tiles unchanged. Strengthen the privacy test too: it currently only checks that one concealed ID is absent; make reading hands throw so the real projection must use only public fields. Add a missing/wrong-seat lastDiscard case so a stale same-face tile cannot get labeled. The Chii/Kan/Ron fixture replaces the original East hand without returning those tiles to the wall, so please conserve all 136 unique physical IDs in those fixtures and assert that before and after the actual claims. Rerun validation, bump the full asset revision for this correction, and make a scoped follow-up commit. Keep review pending.

## D7:19 · assistant · 2026-09-23T05:07:17.330Z

## Plan

I’ll treat this as a scoped Feature 7 correction. I’ll first inspect the committed discard styles/projection/tests and current worktree status, then update the river data/rendering for per-seat “tiles still in river” counts and attached claim labels, strengthen CSS specificity after generic tile rules at desktop and narrow widths, and harden the requested privacy/stale-ID/conservation tests. I’ll bump the complete browser module graph from `v=8` to the next consistent revision, rerun the full suite and syntax checks, update the Feature 7 review evidence while keeping it In Progress/Pending, and create a follow-up commit without staging unrelated existing changes.

## D7:20 · assistant · 2026-09-23T05:07:31.395Z

The inspection confirms the observed cascade: `.river-tile` is defined before the generic `.tile` rules, and the claim label is appended as a sibling in the wrapping flex container. The projection already uses public discard fields, but its test does not prove that hands are inaccessible, and the scenario setup does remove replaced East tiles from the state. I’ll now make the renderer/CSS/test changes and update every relevant `v=8` edge and README to `v=9`.

## D7:21 · assistant · 2026-09-23T05:07:48.671Z

I’ll represent each claimable display as a non-wrapping tile-and-badge group, so flex wrapping moves that unit together. The public projection will expose a `count` derived only from each river; headings will say, for example, “East — 3 tiles still in river.” The test fixture will return displaced East tiles to the wall before selecting scenario tiles and will check 136 unique physical IDs both immediately before and after the claim.

## D7:22 · assistant · 2026-09-23T05:08:19.346Z

The structural changes are in place. I’ll now add high-specificity river selectors (including a grouped claim badge that cannot detach during wrapping), correct the minor projection formatting, update all browser-visible import and asset URLs to `v=9`, and amend the Feature 7 review note without changing its pending status.

## D7:23 · assistant · 2026-09-23T05:08:35.874Z

The stylesheet now applies compact dimensions and shadow behavior through `.discard-river .river-tile`, which outranks the later generic `.tile` and suit border rules, with the same explicit rules inside the narrow breakpoint. I’ll apply the `v=9` revision consistently across every existing browser asset edge, then run the focused tests first to catch fixture issues before full validation.

## D7:24 · assistant · 2026-09-23T05:08:41.711Z

The focused Feature 7 tests pass, including the inaccessible-hands privacy guard, stale/wrong-seat exact-ID case, and 136-ID conservation checks around Chii, Kan, and Ron. I’ll now run the complete validation suite, verify all local asset edges are `v=9` with no stale revisions, and inspect the scoped diff before staging.

## D7:25 · assistant · 2026-09-23T05:08:47.952Z

Full validation passes at **49/49 tests**, syntax checks, scoped whitespace checks, and no stale `v=8`/`v=7` asset references. The correction is ready to stage. I’ll update the review note’s validation count and coverage wording, then stage only the 10 changed Feature 7 correction files, inspect the staged diff, commit, and verify that unrelated evidence/data work remains unstaged.

## D7:26 · assistant · 2026-09-23T05:08:55.000Z

All discovered versioned module and asset references are consistently `v=9`, and the review note accurately records the completed validation while retaining In Progress/Pending status. I’ll now create the scoped follow-up commit and perform a final commit/worktree verification.

## D7:27 · assistant · 2026-09-23T05:09:00.801Z

Implemented the scoped Feature 7 corrections and committed them.

- **Follow-up commit:** `80e7560 fix: compact discard river display`
- Previous Feature 7 commit remains: `ba98c98 feat: show public discard rivers`

### Fixed UI issues
- Each heading now includes its own current river count:
  - `East — 3 tiles still in river`
  - `South — 3 tiles still in river`
  - etc.
- Kept the existing wall count separate as `74 tiles remaining`.
- River tile CSS now uses `.discard-river .river-tile`, which overrides the later generic `.tile` and suit rules:
  - compact `30px × 42px` river tiles;
  - compact padding/type size;
  - no ordinary `2px 3px` hand-tile shadow;
  - gold claimable outline/shadow remains visible.
- Narrow-width rules explicitly preserve the same compact river size and claimable outline.
- The **Current claimable** badge is now inside a `.river-tile-group` with the tile. Flex wrapping moves the tile and badge together, preventing the badge from wrapping alone beneath the river.

Normal hand and meld tile styling was not changed.

### Test hardening
- Projection privacy test now makes `state.hands` throw if accessed, proving discard projection relies only on public fields.
- Added stale/wrong-seat `lastDiscard` cases with identical tile faces; neither gets incorrectly marked claimable.
- Added per-river count assertions.
- Chii, Kan, and Ron fixture setup now returns replaced East tiles to the wall.
- Those claim scenarios assert exactly **136 unique physical IDs** both before and after the actual claim.

### Asset revision and validation
- Bumped the complete browser asset/module graph from **`v=8` to `v=9`** consistently.
- Updated `projects/cedar-table/evidence/FEATURE-7-READY-FOR-REVIEW.md`.
  - Status remains **In Progress**
  - Approval remains **Pending**
- Validation passed:
  - `npm test` — **49/49 passing**
  - `npm run check` — passing
  - Scoped `git diff --check` — passing
  - No stale `v=8` or `v=7` references remain in application assets.

Pre-existing unrelated evidence/data changes remain unstaged and untouched.

## D7:28 · user · 2026-09-23T05:11:44.838Z

I checked the correction on the page. River tiles now measure 30 by 42 pixels while my hand tiles remain 64 pixels wide, and only the offered tile has the gold outline. The count headings match the displayed tiles and Current claimable stays grouped with its tile. Reloading before Continue preserved 5:16, the 74-tile wall, all tile IDs, and Slow.

After continuing, the computer turns produced a West Pon of 3 Characters. I paused with 72 wall tiles, Played 5:42, river counts 3/3/4/2, and West's 8 Bamboo marked as the offered tile. Reloading preserved that entire display exactly. I also reopened the separate 127.0.0.1 saved West Ron finish: all four rivers remained visible with counts 17/16/16/13, no claimable marker, and the same one loss and 3:55 statistics/history. No browser errors appeared. The full 49 tests and syntax checks passed again.

The screenshots and test output are in evidence/feature-7: discard-rivers.png, after-pon-paused.png, completed-hand-rivers.png, tests.txt, and syntax-check.txt. Please append these actual checks and screenshot links to the Feature 7 review note and make a documentation-only commit for that note. Keep narrow-screen behavior described as CSS-reviewed, since I have not run a resized browser viewport check. No further app changes are needed for this review. Keep In Progress and approval pending for @Andy Chen; do not start feature 8.

## D7:29 · assistant · 2026-09-23T05:11:49.720Z

## Plan

I’ll make a documentation-only update to the existing Feature 7 review note: append the reported desktop/browser persistence checks, link the five supplied evidence artifacts, and state that narrow-screen behavior remains CSS-reviewed rather than viewport-tested. I’ll preserve **In Progress**, **Approval: Pending**, and **@Andy Chen**, stage only that note, commit it, and verify the commit/worktree scope.

## D7:30 · assistant · 2026-09-23T05:11:56.663Z

The requested evidence files are present under `projects/cedar-table/evidence/feature-7/`. I’ll append the observed before-Continue, after-Pon paused/reload, and completed-Ron checks with relative screenshot/output links; I’ll explicitly qualify narrow-screen behavior as CSS-reviewed only.

## D7:31 · assistant · 2026-09-23T05:12:01.507Z

The Feature 7 note now records all supplied browser observations, exact state values, screenshot/test-output links, and the CSS-only narrow-screen qualification. I’ll verify the documentation diff and links, then stage and commit only this note before confirming all unrelated worktree changes remain untouched.

## D7:32 · assistant · 2026-09-23T05:12:04.792Z

The documentation diff is limited to the requested review evidence, all five linked artifacts exist, and scoped whitespace validation passes. I’ll now commit only `projects/cedar-table/evidence/FEATURE-7-READY-FOR-REVIEW.md` and verify the resulting documentation-only commit.

## D7:33 · assistant · 2026-09-23T05:12:09.165Z

Updated the Feature 7 review note and created the requested documentation-only commit:

- **Commit:** `09849b8 docs: record feature 7 browser review`

### Documented in
`projects/cedar-table/evidence/FEATURE-7-READY-FOR-REVIEW.md`

The appended review section records:

- Before-Continue saved-hand reload preservation:
  - Played `5:16`
  - `74` wall tiles
  - exact river contents/IDs
  - Slow pace
  - compact `30 × 42px` river tiles versus `64px` hand tiles
  - offered-tile-only gold outline and attached label
- After-West-Pon paused/reload preservation:
  - `72` wall tiles
  - Played `5:42`
  - river counts `3/3/4/2`
  - West 8 Bamboo as the offered tile
- Reopened West Ron completed-hand preservation:
  - river counts `17/16/16/13`
  - no claimable marker
  - one loss and `3:55` history/statistics
- No browser errors.
- Links to:
  - `feature-7/discard-rivers.png`
  - `feature-7/after-pon-paused.png`
  - `feature-7/completed-hand-rivers.png`
  - `feature-7/tests.txt`
  - `feature-7/syntax-check.txt`
- Narrow-screen behavior is explicitly marked **CSS-reviewed only**, with no resized viewport browser validation claimed.

The note continues to state:

- **Status: In Progress**
- **Reviewer: @Andy Chen**
- **Approval: Pending**

No application code was changed, and no Feature 8 work was started. Pre-existing unrelated evidence/data changes remain unstaged and untouched.
