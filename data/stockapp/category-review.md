# StockApp category review

Reference: [Focus Desk](../focus_desk/category-review.md). Labels overlap and are not quotas.

| Category | Focus Desk | StockApp |
|---|---:|---:|
| knowledge-facts | 17 / 60 | 38 / 65 |
| multi-session | 12 / 60 | 14 / 65 |
| multihop | 17 / 60 | 19 / 65 |
| open-domain | 5 / 60 | 6 / 65 |
| preference | 9 / 60 | 8 / 65 |
| single-session | 48 / 60 | 51 / 65 |
| singlehop | 38 / 60 | 40 / 65 |
| temporal | 15 / 60 | 14 / 65 |

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
