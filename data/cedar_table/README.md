# Cedar Table conversation dataset

Status: In Progress. Approval pending.

The canonical submission is [vibe_combined.json](vibe_combined.json): 10 separate original conversations, 320 visible messages, 100 questions and 152 exact evidence citations. [output.json](output.json) contains the same questions; [cleaned-chat.json](cleaned-chat.json) contains the same messages.

## Files

- `D1/`–`D10/`: readable conversations, cleaned messages, publication records and per-message timestamp mappings.
- [source-map.json](source-map.json): original session/message IDs, actual timestamps, original and published text hashes, and documented transformations.
- [session-index.json](session-index.json): feature boundaries, session dates and actual follow-up intervals.
- [annotation-profile.json](annotation-profile.json): overlapping categories and reference proportions.
- [question-dependencies.json](question-dependencies.json): three explicit answer-dependency chains, retaining original evidence.
- [temporal-review.json](temporal-review.json): time-related classification corrections.
- [Game](../../projects/cedar-table/README.md) and [review evidence](../../projects/cedar-table/evidence/FEATURES-1-10-READY-FOR-REVIEW.md).

## Publication records

The per-session `chat-history.json` files contain visible messages with original IDs, roles and timestamps. Local workspace prefixes in text are normalized to `projects/cedar-table`; no timestamps or session boundaries were changed. The source map records this transformation and retains original hashes. Runtime configuration, system prompts, tool payloads, duplicate checkpoints and obsolete drafts remain in the local source archive and are not included in this submission. Publication records are not byte-identical raw archives.

The combined JSON retains the supplied sample's exact fields: project metadata, paired session date/message fields, role/dia_id/text messages and question/category/evidence/answer annotations. Category labels are arrays and may overlap. Temporal items concern time, not ordinary code-revision ordering; multihop items combine facts and may depend on other question answers.

All eight categories are represented. The final proportions differ from the 200-question reference by at most 0.5 percentage points. Source grounding and category meaning were reviewed in addition to numerical counts. Review approval remains pending.

Readable Markdown removes trailing spaces for clean rendering; JSON message text and timestamp mappings remain authoritative. Screenshot filename corrections are recorded in the [image format map](../../projects/cedar-table/evidence/image-format-map.json).
