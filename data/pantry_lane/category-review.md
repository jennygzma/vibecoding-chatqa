# Annotation coverage review

Status: In Progress. Review approval pending.

The final set has exactly 50 distinct questions: Q001–Q010 use D1, Q011–Q020 use D2, Q021–Q030 use D3, Q031–Q040 use D4, and Q041–Q050 require facts from multiple original conversations. The standalone and combined exports contain the same questions; they are two representations of one set.

## Reference comparison

The supplied guide's annotation page and the 200-question combined sample were inspected. Paths, checksums and observed proportions are preserved in `reference-review.json`. The guide supports overlapping text category labels, concise closed answers and open answers of at most one sentence; it does not specify numeric category quotas.

| Category | Supplied sample | Pantry Lane | Count |
| --- | ---: | ---: | ---: |
| single-session | 79% | 80% | 40 |
| multi-session | 21% | 20% | 10 |
| singlehop | 52.5% | 56% | 28 |
| multihop | 39% | 36% | 18 |
| preference | 17% | 18% | 9 |
| temporal | 14.5% | 18% | 9 |
| knowledge-facts | 25.5% | 28% | 14 |
| open-domain | 8% | 8% | 4 |

These labels overlap and therefore do not sum to 100%. The four open questions carry no hop label. Pantry Lane has more calendar, expiry and clock-refresh questions because these are explicit app rules. Unit dimensions, saved-data protection and numeric comparison also support factual questions. Differences are grounded in content rather than adjusted to reproduce sample percentages.

## Semantic decisions

Every question has an individual grounding and category note in `annotation-semantic-review.json` and `annotations.md`. Lists of fields, several observations in one report, citation count and implementation chronology are not sufficient reasons to label a question multihop. Q019 was classified singlehop because its reproduced case and expected outcome are directly stated. Q029 likewise directly retrieves two observed browser outcomes. Q013 stays single-session because D2 already restates both its recipe requirement and stock quantity.

Multihop labels identify calculations or integration of distinct facts: serving scaling, stock shortfall, measured layout-width difference, failure-to-repair mapping and cross-feature comparisons. Calendar dates, durations and local-day behavior support temporal labels; ordinary before/after repairs do not automatically receive that label. Q042 explicitly assumes one cooking-time allocation per meal and does not claim that time scales with servings.

Closed answers use short phrases. Q010, Q017, Q026 and Q039 each give a one-sentence open explanation grounded in the requested behavior. No adversarial label was added outside the supplied category vocabulary.

## Cross-session necessity

The entire D1–D4 export was checked for answer leakage, including follow-up messages that repeat earlier facts.

| Question | Distinct facts required |
| --- | --- |
| Q041 | D2's two-serving baseline plus D3's two scheduled serving counts. |
| Q042 | D2's 20-minute duration plus D3's two meal entries. |
| Q043 | D1's October 3 expiry plus D3's October 5 week start. |
| Q044 | D1's specific ingredient filter criteria plus D2's observed recipe-search case handling. |
| Q045 | D1's optional inventory expiry field plus D2's recipe cooking-minutes field. |
| Q046 | D1's ingredient-removal confirmation plus D3's block on referenced recipe removal. |
| Q047 | D2's ingredient baseline plus D3's planned servings; Q041 supplies the batch calculation. |
| Q048 | D3's immediately updated weekly demand plus D4's retained stale shopping snapshot. |
| Q049 | D2's no-consumption rule for recipe preview/scaling plus D4's purchase-checkbox rule. |
| Q050 | D1's final eight-test result plus D3's repaired 25-test result. |

D4 repeats net shortages but not the full recipe baseline or 20-minute duration. D3 reports live recipe propagation but does not restate D2's original ingredient quantities. Generic preservation of earlier views does not provide their detailed rules. Directed dependencies are recorded in `question-dependencies.json`, with only earlier questions referenced and no cycles.

## Verification boundaries

The validator confirms exact source excerpts and classification consistency; it does not prove semantic correctness by counting labels. Browser evidence, implementation reports, stated requirements and review approval remain distinct. Questions about the midnight repair cite source inspection and simulated tests, without claiming that a real midnight was observed. The four original conversation boundaries, all 94 public messages and source provenance are retained.
