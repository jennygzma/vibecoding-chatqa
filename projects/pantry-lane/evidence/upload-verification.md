# Repository package verification

Status: In Progress. Review approval pending.

The repository places the application in `projects/pantry-lane/` and the public conversation dataset in `data/pantry_lane/`. The submission preserves all four original session identities, 94 public messages and exactly 50 questions. Maintained guides link to this repository layout.

Verification on October 5, 2026:

- All 35 application tests passed with zero failures or skips: [upload-app-tests.txt](upload-app-tests.txt).
- All configured module syntax checks passed: [upload-syntax-checks.txt](upload-syntax-checks.txt).
- Published-export validation passed for four sessions, 94 messages, 50 questions, export/application file hashes, exact evidence, category arrays, timestamp consistency and dependencies: [upload-dataset-validation.txt](upload-dataset-validation.txt).
- All 10 repository dataset-validator regression tests passed: [upload-dataset-tests.txt](upload-dataset-tests.txt).
- The original local archive validator and its 11 regression tests were rerun successfully before packaging. Its replay checks source checksums, original IDs/timestamps and complete public-message coverage.
- All 14 application source/test/package files and all 33 copied source-bearing dataset files match the local submission byte for byte. Original conversation text, JSON exports, source maps and cleaning ledgers were not rewritten.
- Maintained documentation links, submission filenames, attribution markers, credential patterns and commit configuration were inspected.

Full original archives and machine-specific capture helpers remain local. The repository validator verifies published exports and their manifests; it does not claim to replay excluded archives. The preserved local verification manifest and original checksum manifests describe that separate source check.

Image inspection found that the retained D3/D4 `desktop.png` files are 390-pixel phone captures, duplicated under their historical filenames. The current review labels them accordingly; D1/D2 contain independent 1280-pixel desktop captures. Image bytes and historical filename references are retained unchanged.

The screenshots and CSV evidence in [Ready for Review](READY-FOR-REVIEW.md) record the earlier actual feature checks. No new browser pass is claimed for packaging. An actual midnight was not awaited; the application suite includes simulated local-day and registered-focus callback regressions.

Review approval remains pending. This submission does not merge the application into the default branch.
