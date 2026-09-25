# Repository package verification

Status: In Progress. Review approval pending.

The repository package places the app in `projects/focus-desk/` and the dataset in `data/focus_desk/`. Validation scripts resolve the shared dataset location. Maintained documentation links were adjusted for this layout; original messages, source records, checksums, and annotation contents remain unchanged.

Verification on September 25, 2026:

- All 31 app tests passed, with zero failures or skips; all configured syntax checks passed.
- Dataset validation passed for four distinct sessions, 69 public messages, 60 questions, exact quotes, original timestamps, and raw-file checksums.
- All six dataset-integrity tests passed.
- Published original records and dataset JSON files match the local source files byte for byte.
- Documentation links, excluded local caches, and credential patterns were inspected before upload.

The [review report](REVIEW.md) links browser screenshots, the actual CSV download, repair verification, and remaining browser coverage limitations. No additional browser testing was claimed for packaging changes.
