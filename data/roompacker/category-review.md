# Roompacker category review

Reference: [Focus Desk](../focus_desk/category-review.md). Labels overlap and are not quotas.

| Category | Focus Desk | Roompacker |
|---|---:|---:|
| knowledge-facts | 17 / 60 | 32 / 60 |
| multi-session | 12 / 60 | 13 / 60 |
| multihop | 17 / 60 | 20 / 60 |
| open-domain | 5 / 60 | 5 / 60 |
| preference | 9 / 60 | 8 / 60 |
| single-session | 48 / 60 | 47 / 60 |
| singlehop | 38 / 60 | 35 / 60 |
| temporal | 15 / 60 | 6 / 60 |

Each question has a source-support and category rationale in
`annotation-semantic-review.json`, bound to the exact answer, question, labels
and evidence by a checksum. Cross-session entries also explain which distinct
facts require separate original conversations. These are editorial judgments;
the validator checks consistency and provenance, not semantic truth by label count.

Direct retrieval stays singlehop even with several excerpts. Comparisons,
calculations and integrations of distinct facts use multihop. Temporal covers
actual durations, intervals, dates or time-dependent rules; ordinary feature
revision order alone does not qualify. Preference requires an explicit user
choice. Open-domain questions have concise one-sentence explanations and no hop
label, following Focus Desk. Negative answers are not automatically adversarial.

All eight Focus Desk labels have grounded examples. The smaller set removes
repetitive control, color and implementation-detail lookups. No count or category
percentage was used as a target.
