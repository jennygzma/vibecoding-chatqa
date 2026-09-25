# Focus Desk dataset

Status: In Progress. Review approval pending.

The current submission contains four independent original feature sessions, 69 public messages, and 60 English questions. The app covers task management, focus timing, daily planning, and Insights with CSV export.

- [Combined conversation and questions](vibe_combined.json), with the required five project fields.
- [Questions](annotations.json), [readable conversation](conversation.md), and [session index](session-index.json).
- [Reconstruction policy](recording-policy.md), [timing review](timing-review.md), and [message renumbering](message-renumbering.json).
- [Question review](annotation-review.md), [per-question reasoning](annotation-semantic-review.json), [category comparison](category-review.md), and [answer dependencies](question-dependencies.json).
- Original records, source maps, and cleaning ledgers in D1–D4. Original record contents and metadata are preserved without edits.
- [Earlier revisions](revisions/README.md), retained for traceability and excluded from the current submission counts.
- [App and startup instructions](../../projects/focus-desk/README.md) and [verification evidence](../../projects/focus-desk/evidence/REVIEW.md).

From the repository root, run `python3 scripts/validate_focus_desk.py`. Run the six dataset-integrity tests with `python3 projects/focus-desk/scripts/test_dataset_validation.py`.

Original transcripts contain historical local file links; use the app directory above for the published source files. These links remain unchanged to preserve the recorded text.
