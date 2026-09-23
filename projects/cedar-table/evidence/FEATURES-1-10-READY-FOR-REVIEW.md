# Cedar Table — ten-feature review

**Status: In Progress**
**Reviewer: @Andy Chen**
**Approval: Pending**

Ready for Review — @Andy Chen. All ten features have been implemented in ten separate original conversations. The package contains 100 grounded questions, 152 exact citations, 320 visible messages and 1,092 original records. Approval has not been inferred from implementation or passing checks.

## Features and original conversations

| Conversation | Feature |
|---|---|
| [D1](../../../data/cedar_table/D1/conversation.md) | Playable four-seat Mahjong hand |
| [D2](../../../data/cedar_table/D2/conversation.md) | Save, pause, and continue a hand |
| [D3](../../../data/cedar_table/D3/conversation.md) | Completed-hand history |
| [D4](../../../data/cedar_table/D4/conversation.md) | Statistics from completed hands |
| [D5](../../../data/cedar_table/D5/conversation.md) | On-demand standard-hand practice hints |
| [D6](../../../data/cedar_table/D6/conversation.md) | Computer pace preferences and scheduling |
| [D7](../../../data/cedar_table/D7/conversation.md) | Four-seat public discard rivers |
| [D8](../../../data/cedar_table/D8/conversation.md) | Select and confirm an East discard |
| [D9](../../../data/cedar_table/D9/conversation.md) | Filter completed-hand history by result |
| [D10](../../../data/cedar_table/D10/conversation.md) | Export retained completed-hand history as CSV |

## Review files

- [Combined JSON](../../../data/cedar_table/vibe_combined.json), [session boundaries and actual times](../../../data/cedar_table/session-index.json), [source mappings and hashes](../../../data/cedar_table/source-map.json).
- [Validation report](conversation-validation.json), [category profile](../../../data/cedar_table/annotation-profile.json), [explicit answer dependencies](../../../data/cedar_table/question-dependencies.json).
- [Feature 10 evidence](FEATURE-10-READY-FOR-REVIEW.md), [browser snapshots](feature-10/browser-validation.json), [actual downloaded CSV](feature-10/downloaded-history.csv), [download and resource validation](feature-10/validation.json).

## Final code validation

- `5735668`: CSV export implementation; `b81fc06`: strengthened CSV regressions; `ac95e5b`: final browser review note.
- 66 tests passed; syntax checks passed. All 11 browser modules and 15 local import edges use revision 13.
- Actual downloads before Continue and after a finished hand are byte-identical (182 bytes). A zero-match filter still exports the retained West result; empty history disables the button.
- Fractional milliseconds, retained conflicting duplicates, Unicode, CSV quotes, embedded CRLF, four formula prefixes, UTC timestamps, estimated flags and latest-50 normalization have focused regression coverage.
- Nonempty-history export during active play or pause and injected preparation failures were not browser-tested; their event paths were inspected in source. No cross-browser compatibility claim is made.

## Question coverage and distribution

The PDF supplies categories and grounding/answer-format guidance, not numerical quotas. The supplied 200-question JSON provides the comparison proportions. All 100 questions and exact excerpts were reviewed; category overlap is intentional.

| Category | Questions / current % | Reference % |
|---|---:|---:|
| single-session | 79 / 79% | 79% |
| multi-session | 21 / 21% | 21% |
| singlehop | 53 / 53% | 52.5% |
| multihop | 39 / 39% | 39% |
| preference | 17 / 17% | 17% |
| temporal | 15 / 15% | 14.5% |
| knowledge-facts | 26 / 26% | 25.5% |
| open-domain | 8 / 8% | 8% |

The largest difference is 0.5 percentage points. Temporal questions concern dates, timestamps or durations. Cross-session questions combine separate original sessions. Multihop questions combine facts or other grounded answers; three explicit answer-dependency chains are retained. Open-domain answers are no longer than one sentence.

## Format and timing checks

The combined file matches the supplied top-level and message/QA fields, uses session dates, restarts numbering within every conversation, and preserves category arrays. Per-message original timestamps and IDs are stored in the source map without adding fields to the reference schema. Original speaker roles remain unchanged. Publication records normalize local workspace paths; original archive hashes are retained in the source map.

D10 follow-ups occurred 70.407 and 84.285 seconds after prior responses, following actual reading, download inspection, page checks and test review. Earlier retry messages and imperfect planning statements remain in their source sessions. Timestamp gaps are not treated as proof of authorship.

All ten features have recorded implementation and validation; the outstanding step is review approval.


## Repository submission

Ready for Review — @EYCtheHandsome. Status: In Progress. Approval pending.

The submission is organized under `projects/cedar-table`, `data/cedar_table`, and `scripts/validate_cedar_table.py`. The existing Mahjong project is preserved. Implementation hashes in the earlier checkpoint notes identify the local development history; the repository submission commit identifies the published file set.

Publication records retain original visible-message IDs, roles and timestamps, with local workspace prefixes normalized to repository paths. Full runtime archives and obsolete working snapshots remain local. The [dataset guide](../../../data/cedar_table/README.md) documents the published scope and the source map records text transformations and original hashes.

Fresh upload checks: 66 tests passed, syntax checks passed, and the publication validator checked JSON syntax, unique keys, reference fields, ten sessions, 320 messages, 100 questions, 152 exact citations, timestamps, source hashes, all eight categories, three answer-dependency chains, and maintained documentation links.
