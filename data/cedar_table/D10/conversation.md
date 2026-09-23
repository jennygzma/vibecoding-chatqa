# D10 — Export retained completed-hand history as CSV

Status: In Progress. Approval pending.

## D10:1 · user · 2026-09-23T06:14:02.407Z

For feature 10, add a local CSV export of completed-hand history. Put a native Export history CSV button in the History section, with short English help saying it exports all retained saved results regardless of the current History result filter. Disable it when there are no valid retained results. I prefer a direct download named cedar-table-history.csv, with no dialog, external service, or new saved preference.

Export the existing canonical normalized latest 50 results, newest first, with first-valid duplicate handling before the cap. Export all retained results even when the current filter shows zero matches. Use these columns in this order: hand_id,result,winner,finished_at_utc,finished_at_estimated,played_ms,played. Winner should be East, South, West, North, or Draw. Finish time should be an unambiguous UTC ISO timestamp; the estimated flag must preserve whether a migrated finish time is estimated. Played milliseconds remain exact and the readable Played value follows the current duration formatting, not wall-clock time. An otherwise retained record with an unrepresentable Date must not crash the export; leave its timestamp cell blank. Keep result text and physical history IDs faithfully except for necessary CSV escaping and spreadsheet-formula protection. Quote commas, double quotes and line breaks correctly; guard formula-leading text, including after leading whitespace. Use UTF-8 and CRLF rows.

Use a pure production helper for generating CSV and meaningful tests for every winner, exact header/order, dates and estimated flags, durations, escaping, formula protection, empty input, invalid records, duplicate IDs, newest-50 retention, and non-mutation. Wire a browser-native Blob download with cleanup of its temporary URL and a clear inline failure message when preparation fails. Export must not write local storage, advance a turn, reset the clock, remove hints, clear an East tile selection, or change the filter/statistics. It must work before Continue, paused, during a hand and after a finish. Preserve storage notices.

Start from the existing 61 passing tests and v=12 assets. Implement only feature 10 in this new conversation. Update the full local browser asset graph to one next shared revision, include new modules in syntax checks, run the checks, make a scoped local commit, and create evidence/FEATURE-10-READY-FOR-REVIEW.md. Keep status In Progress and approval pending, with Ready for Review for @Andy Chen. Leave unrelated data and previous evidence edits untouched; I will inspect the page and downloaded CSV.

## D10:2 · assistant · 2026-09-23T06:14:05.197Z

## Plan

I’ll first inspect the repository structure, current History UI/storage/history normalization logic, test setup, asset revisioning, and existing evidence conventions. Since this is **plan mode**, I will not edit files, create commits, or run state-changing commands. I’ll then map the requested feature to the established architecture and identify any implementation decisions that need confirmation.

## D10:3 · assistant · 2026-09-23T06:14:10.653Z

The working tree already contains unrelated modified/untracked evidence and data. I will preserve those paths exactly and scope any future change/commit to Feature 10 files only. The codebase confirms a native no-build ESM application, a current shared browser revision of `v=12`, and the existing history has canonical retained-result behavior that needs to be reused rather than derived from the visible filter.

Next I’ll read the focused source/test/evidence files to establish the exact normalization contract, UI markup, notices, and test command.

## D10:4 · assistant · 2026-09-23T06:14:19.878Z

## Findings and implementation plan (no changes made)

The baseline is exactly **61 passing tests**. The application already has the critical shared normalization path:

- `normalizeCompletedHistory()` in `projects/cedar-table/persistence.js` validates entries, retains the **first valid occurrence** of each physical `handId` in saved-array order, sorts newest-first, then applies the 50-result cap.
- The History filter and Statistics both normalize independently from the complete in-memory `history`, so export should likewise call that canonical helper directly and must not use the filtered display list.
- Existing duration presentation is `m:ss` in `projects/cedar-table/app.js`; a pure CSV helper should share or reproduce that exact formatting without coupling tests to DOM.
- Current asset revision is consistently `v=12`; the next implementation must move all local browser module edges to a single `v=13`, including the new export helper import.
- The supplied modified/untracked evidence/data paths are unrelated and must stay untouched. The final scoped commit should include only Feature 10 source/tests, its evidence file, and unavoidable shared revision/documentation updates.

To complete Feature 10 in **act mode**, I will:

1. Read the remaining persistence validity/migration code plus History styles and event wiring, to precisely preserve migrated timestamps and notices.
2. Add a pure ESM CSV module with:
   - exact eight-column CRLF/UTF-8 CSV output;
   - canonical normalization before export;
   - `East`/`South`/`West`/`North`/`Draw` winner mapping;
   - ISO UTC timestamp conversion with blank output for invalid/unrepresentable Date values;
   - exact `played_ms` plus current `m:ss` Played format;
   - CSV quoting and spreadsheet-formula protection for formula-leading text after leading whitespace;
   - no input mutation.
3. Add focused Node tests covering every requested category (all winners, header/order, date/estimated flags, duration, escaping/protection, empty/invalid input, duplicate-first retention, newest-50, non-mutation).
4. Wire the History section to a native **Export history CSV** button and brief English help. Its enabled state will be based on canonical retained results—not the filter—and click behavior will create a UTF-8 `Blob`, direct-download `cedar-table-history.csv`, revoke the temporary object URL, and render a clear inline preparation error without overwriting storage notices.
5. Update the browser asset graph uniformly from `v=12` to `v=13`, add the module to `npm run check`, update the README’s revision guidance, and create only `projects/cedar-table/evidence/FEATURE-10-READY-FOR-REVIEW.md` with **In Progress**, **@Andy Chen**, **Pending**, and **Ready for Review** wording.
6. Run the full tests, syntax check, and targeted inspection; then create a scoped local commit excluding all pre-existing unrelated work.



## D10:5 · assistant · 2026-09-23T06:14:27.743Z

## Implementation plan

I have completed the required architectural review and baseline validation. I will now implement Feature 10 as a self-contained CSV-export module and UI integration, without changing storage behavior or the filter/statistics pipelines. I’ll preserve all pre-existing evidence/data changes and stage only the Feature 10 files plus shared revision/documentation updates for the scoped commit.

## D10:6 · assistant · 2026-09-23T06:14:47.295Z

I’ll add the pure helper and its isolated Node tests first, then wire the UI. The helper will deliberately normalize its own input (rather than receive a filtered list), use UTC `toISOString()` guarded against `RangeError`, preserve the migration estimate as lowercase CSV boolean text, and prevent formulas by prefixing an apostrophe whenever the first non-whitespace character is `=`, `+`, `-`, or `@`.

## D10:7 · assistant · 2026-09-23T06:15:02.969Z

The pure helper, initial tests, History controls, and syntax-check inclusion are now in place. Next I’ll integrate the native download without invoking game/storage operations, share the helper’s duration formatter with the existing display, add presentation styles, and update every browser-visible local module edge to `v=13`.

## D10:8 · assistant · 2026-09-23T06:15:20.055Z

The asset-update grep ran concurrently with the revision rewrite, so it reported a stale `v=12` snapshot; the rewrite’s own result confirms the final files are at `v=13`. I’ll now make the download cleanup exception-safe (including failures after URL allocation), document the export behavior, and then run the full validation suite.

## D10:9 · assistant · 2026-09-23T06:15:29.609Z

I identified one important notice-isolation detail before validation: a successful export must not clear an existing history storage notice. I’ll separate the export’s inline status from the existing storage/history notice so blocked/damaged-storage messaging remains intact.

## D10:10 · assistant · 2026-09-23T06:15:45.060Z

Validation now passes at **65/65 tests** (the original 61 plus four focused CSV-export tests), and `npm run check` includes and validates the new module. The helper tests cover the requested winner mapping, schema, timestamps/estimated flag, duration, CSV escaping/formula protection, empty/invalid input, duplicate-first/newest-50 retention, invalid dates, and non-mutation.

I’ll perform the final source/asset-graph and browser-serving checks, create the Feature 10 review evidence without touching existing evidence, and then stage/commit only the scoped implementation files.

## D10:11 · assistant · 2026-09-23T06:15:55.147Z

The served local page exposes the new control and `v=13` assets, and a direct helper smoke export confirms first-valid duplicate handling and CRLF output. Existing unrelated evidence/data edits remain unstaged. I’ll now add the requested Feature 10 review record, re-run final checks with scoped diff validation, and create the local scoped commit.

## D10:12 · assistant · 2026-09-23T06:16:01.062Z

Final validation is clean: **65/65** tests pass, all syntax checks pass, and the scoped diff has no whitespace errors. I will now stage only the Feature 10 implementation, tests, asset-graph/documentation revisions, and its new review evidence file; the pre-existing modified/untracked evidence and `data/` files will remain unstaged.

## D10:13 · assistant · 2026-09-23T06:16:03.566Z

The scoped commit was created as `df1ce45`; it contains only the 11 Feature 10 files listed by the staged-file check. I’ll update the new Feature 10 evidence with that exact commit identifier, amend only that scoped commit, and perform one final committed-tree/status verification.

## D10:14 · assistant · 2026-09-23T06:16:07.522Z

The evidence update is the only post-commit scoped modification. I’ll amend it into the same Feature 10 commit, then verify the committed file set, tests/checks, and ensure unrelated work is still unstaged.

## D10:15 · assistant · 2026-09-23T06:16:11.948Z

The amend changed the commit ID to `3bebeb0`, so the evidence’s embedded pre-amend ID would be stale. I’ll remove that self-referential hash from the evidence (the final commit cannot reliably contain its own final ID), amend once more, and verify the final evidence/status.

## D10:16 · assistant · 2026-09-23T06:16:15.613Z

I removed the stale self-reference from the evidence. I’ll now fold that documentation-only correction into the same scoped commit and confirm its final identifier and clean scoped state.

## D10:17 · assistant · 2026-09-23T06:16:20.205Z

## Feature 10 complete — Ready for Review

Implemented local completed-hand history CSV export.

### Delivered
- Added **Export history CSV** button and English help in the History section.
- Direct browser-native download: `cedar-table-history.csv`.
- Uses a UTF-8 `Blob`, temporary object URL, and guaranteed URL cleanup.
- Button disables only when there are no valid retained results; it remains enabled when a History filter has zero matches.
- Export always uses canonical normalized History data:
  - valid records only;
  - first valid duplicate ID wins before sorting/capping;
  - newest first;
  - maximum 50 retained results;
  - independent of History filter and Statistics.
- Exact CSV schema and CRLF rows:
  ```text
  hand_id,result,winner,finished_at_utc,finished_at_estimated,played_ms,played
  ```
- Winner values export as `East`, `South`, `West`, `North`, or `Draw`.
- UTC ISO finish timestamps; unrepresentable dates leave the timestamp cell blank.
- Preserves estimated migrated completion-time status.
- Retains exact played milliseconds and exports readable `m:ss` active Played duration.
- Proper CSV quoting for commas, quotes, and line breaks.
- Spreadsheet formula protection for IDs/result text beginning with `=`, `+`, `-`, or `@`, including after leading whitespace.
- Export preparation failures show a separate inline error while preserving History storage notices.
- Export does not write storage or alter game state, clock, hints, East selection, filter, or statistics.

### Code and assets
- New pure helper: `projects/cedar-table/history-csv.js`
- New test suite: `projects/cedar-table/history-csv.test.js`
- Updated full browser asset graph from `v=12` to shared `v=13`.
- Added the new module to `npm run check`.
- Added review evidence:
  `projects/cedar-table/evidence/FEATURE-10-READY-FOR-REVIEW.md`

### Validation
- `npm test` — **65/65 passing**
- `npm run check` — passed, including `history-csv.js`
- Scoped `git diff --check` — passed
- Local HTTP smoke check confirmed `v=13`, the button, and the new module are served.

### Scoped local commit
- `5735668 feat: export completed hand history CSV`

All pre-existing unrelated evidence and `data/` modifications remain unstaged and untouched.

**Status: In Progress**
**Reviewer: @Andy Chen**
**Approval: Pending**
**Ready for Review — @Andy Chen**

## D10:18 · user · 2026-09-23T06:17:30.612Z

I tested the direct download before Continue using the existing West Ron history. With East wins selected, the list says Showing 0 of 1 saved hands, but Export history CSV stays enabled and downloads one full result. I parsed the actual downloaded file: seven columns, hand_id 1790129396246-qom52zt2jql, West wins by Ron, winner West, finished_at_utc 2026-09-23T02:09:56.193Z, finished_at_estimated false, played_ms 235602.40000000224, played 3:55. Both lines use CRLF. The page still has the East wins filter, one-loss statistics and Played 3:55. On localhost, the empty history correctly disables export.

Please strengthen the CSV regressions before final review. The duplicate/retention test removes the first valid duplicate outside the newest-50 window, so it does not assert the actual exported row for a retained duplicate. Add a small exact-row case with an invalid first candidate, a valid West result with its own timestamp/estimate/duration, and a later conflicting East result. Also test + and - formula-leading text, ordinary Unicode text, CRLF inside a quoted cell, and fractional Played milliseconds so downloaded precision is protected. Use exact expected output or parseable round-trip assertions rather than a vacuous predicate. Keep production behavior and v=13 unchanged if the tests pass. Run the full checks, update the Feature 10 review evidence accurately, make a scoped test commit, and keep In Progress / approval pending.

## D10:19 · assistant · 2026-09-23T06:17:34.539Z

## Plan

I’ll strengthen only the Feature 10 CSV regression tests as requested, leaving production behavior and the shared `v=13` asset graph unchanged. I’ll first inspect the committed test/evidence state and working tree so the test additions align with the current helper contract and avoid unrelated edits. Then I’ll add exact assertions for retained duplicate output, formula prefixes, Unicode/CRLF escaping, and fractional duration precision; run the full checks; update only the Feature 10 evidence; and create a scoped test commit.

## D10:20 · assistant · 2026-09-23T06:17:51.540Z

The current production helper already preserves fractional `played_ms` by serializing `String(hand.playedMs)`, and it uses `v=13`; no production change is needed. I’ll replace the formula test with exact multi-row assertions for `=`, `+`, `-`, `@`, Unicode, and embedded CRLF, add a dedicated exact retained-duplicate row case with fractional duration, and remove the vacuous duplicate predicate from the retention test.

## D10:21 · assistant · 2026-09-23T06:18:05.624Z

The requested regression coverage is now in place without touching runtime code: the retained duplicate case proves the valid West record—not the later East conflict—is exported with its own timestamp, estimate, and full fractional millisecond value. I’ll now run the complete suite and syntax checks, verify the scoped diff/asset revision, then commit only the test and Feature 10 evidence files if all validations pass.

## D10:22 · assistant · 2026-09-23T06:18:10.311Z

All validation passes: **66/66 tests** and `npm run check`; scoped whitespace validation is clean. The test’s byte-for-byte expected CSV includes embedded CRLF within quoted fields and row CRLF boundaries, while the retained-duplicate test asserts the full West row and `235602.40000000224` value. The asset graph remains uniformly `v=13`. I’ll make the requested scoped follow-up commit containing only the CSV tests and Feature 10 evidence, then verify the resulting commit and clean scope.

## D10:23 · assistant · 2026-09-23T06:18:13.452Z

The scoped commit was created successfully as `b81fc06 test: strengthen CSV export regressions` with exactly two files. The remaining modified/untracked items are the pre-existing unrelated evidence and `data/` work identified before this task. I’ll perform one final commit-content/status verification to confirm no production files or asset revisions entered the follow-up commit.

## D10:24 · assistant · 2026-09-23T06:18:17.140Z

## Completed: strengthened Feature 10 CSV regressions

Created scoped follow-up commit:

- `b81fc06 test: strengthen CSV export regressions`

### Regression coverage added

In `projects/cedar-table/history-csv.test.js`:

- Replaced the limited formula/escaping check with byte-for-byte expected CSV covering:
  - Formula-leading values after whitespace for `=`, `+`, `-`, and `@`
  - Ordinary Unicode text (`西風`, `café`)
  - Embedded CRLF in quoted CSV cells
  - Embedded quotes and commas
  - CRLF record separators and final CRLF
- Added an exact retained-duplicate case:
  - Ignores an invalid first duplicate candidate.
  - Exports the first valid **West** result rather than a later conflicting **East** result.
  - Asserts its exact UTC timestamp, `finished_at_estimated=true`, result text, `3:55` display duration, and full fractional `played_ms` value:
    - `235602.40000000224`

The existing newest-50 retention test remains, but no longer relies on the vacuous condition that the duplicate happens to fall outside the retained window.

### Evidence updated

Updated `projects/cedar-table/evidence/FEATURE-10-READY-FOR-REVIEW.md` accurately:

- Test count is now **66/66 passing**.
- Documents the expanded exact CSV coverage.
- Kept Feature 10 **In Progress**, reviewer **@Andy Chen**, and approval **Pending**.

### Validation

Passed:

```sh
npm test
# 66 passed, 0 failed

npm run check
# passed
```

Also passed scoped `git diff --check` and verified the follow-up commit contains only:

- `history-csv.test.js`
- `evidence/FEATURE-10-READY-FOR-REVIEW.md`

No production behavior was changed, and the browser asset revision remains `v=13`. Pre-existing unrelated evidence and `data/` changes remain untouched and unstaged.

## D10:25 · user · 2026-09-23T06:19:41.425Z

Final review: I independently ran the full suite and syntax checks: 66 tests passed. The complete browser import graph has 11 modules and 15 local import edges, all at v=13. I also clicked Continue on the existing ended West Ron hand, exported again with East wins still selected, and compared the two actual downloaded files byte for byte: both are the same 182 bytes. The ended page kept 20 wall tiles, Played 3:55, and one-loss statistics; no download changed the filter. On localhost, All results and Draws both leave the export disabled with zero history, and the saved hand still shows 68 wall tiles and Played 12:33. Both browser origins report no console errors.

Evidence is in evidence/feature-10/: export-with-no-matches.png, empty-history-disabled.png, downloaded-history.csv, browser-validation.json, and validation.json. Please update only the Feature 10 review note with links, the two implementation/test commits, and the final checks. Be precise about coverage: nonempty-history export while actively playing or paused was not exercised in the browser, and I did not inject download-preparation failures. Those behavior paths were inspected in source; do not claim those UI scenarios were tested. Keep In Progress, approval pending, and Ready for Review for @Andy Chen, and make a scoped documentation commit. No more implementation is needed.

## D10:26 · assistant · 2026-09-23T06:19:45.568Z

## Plan

I’ll update only `projects/cedar-table/evidence/FEATURE-10-READY-FOR-REVIEW.md`. First I’ll inspect the supplied Feature 10 artifacts, the current review note, and the two scoped commit identifiers. I’ll then add links to the evidence plus an accurate final-validation section that distinguishes browser-exercised scenarios from source-inspected paths, preserve **In Progress / Pending / Ready for Review**, verify the documentation-only diff, and create a scoped documentation commit.

## D10:27 · assistant · 2026-09-23T06:19:52.495Z

The supplied evidence confirms the requested final facts: the CSV fixture is 182 bytes, contains the expected seven columns and West Ron row, its two downloads matched byte-for-byte, and validation records 11 reachable modules with 15 versioned local import edges at `v=13`. I’ll now update the review note only, linking the five Feature 10 artifacts and explicitly recording that active/paused nonempty-history exports and injected preparation failures were source-inspected rather than browser-exercised.

## D10:28 · assistant · 2026-09-23T06:19:57.872Z

The review note now contains the final browser results, direct relative links to all five supplied artifacts, both implementation/test commits, and the two requested coverage limits without overstating browser coverage. I’ll verify the documentation diff and every linked artifact, then create the documentation-only commit and confirm its scope.

## D10:29 · assistant · 2026-09-23T06:19:59.718Z

The documentation diff is limited to the Feature 10 review note, passes whitespace validation, and all five relative evidence links resolve. I’ll now create the scoped documentation commit, then verify that it contains only this note and that the unrelated working-tree changes remain uncommitted.

## D10:30 · assistant · 2026-09-23T06:20:02.470Z

The documentation commit `ac95e5b` was created with exactly `projects/cedar-table/evidence/FEATURE-10-READY-FOR-REVIEW.md`; `git show --check` is clean. I’ll do the final content/status inspection so the completed review note, commit scope, and preserved status are confirmed from the committed version.

## D10:31 · assistant · 2026-09-23T06:20:05.684Z

## Final review note updated

Created scoped documentation commit:

- `ac95e5b docs: record feature 10 final browser review`

Updated only:

- `projects/cedar-table/evidence/FEATURE-10-READY-FOR-REVIEW.md`

The note now includes:

- Final validation results: **66/66 tests**, syntax checks passing.
- Browser import graph confirmation: **11 modules**, **15 local edges**, all `v=13`.
- Browser-tested zero-match East-wins filter export behavior, including byte-identical **182-byte** downloads before Continue and after the ended hand.
- Confirmed preservation of filter, statistics, 20-wall/3:55 ended state, and 68-wall/12:33 saved-hand state.
- Empty-history disabled behavior for All results and Draws.
- No console errors on both tested origins.
- Links to all five supplied Feature 10 evidence artifacts.
- Explicit coverage limits:
  - Nonempty-history export during active play or pause was not browser-tested.
  - Download-preparation failures were not injected/browser-tested.
  - Both paths were source-inspected only.
- Both scoped implementation/test commits:
  - `5735668 feat: export completed hand history CSV`
  - `b81fc06 test: strengthen CSV export regressions`

Verification completed:

- Documentation diff passed `git diff --check`.
- All five relative evidence links resolve.
- Commit contains exactly the Feature 10 review note.
- Feature remains **In Progress**, **Ready for Review** for **@Andy Chen**, with approval **Pending**.
- Pre-existing unrelated working-tree changes remain untouched and uncommitted.
