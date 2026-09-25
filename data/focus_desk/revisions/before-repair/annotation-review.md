# Annotation content review

Status: In Progress. Review approval pending.

Follow-up review found that some multihop and multi-session labels need correction, and the readable conversations omit recorded progress replies. The earlier conclusions below are not final approval. See `../../evidence/recheck-findings.md` for the concrete counterexamples and required corrections.

All four readable original conversations were reviewed before the 60 English question-and-answer pairs were finalized. Every question was reviewed against its cited excerpts and the surrounding message for answer support, scope, and category meaning. This is a content review separate from the format and checksum validation in `scripts/validate_dataset.py`.

The set has 60 distinct question texts and 60 nonempty answers. Closed answers are brief; all five open-domain answers are one sentence. Preference items point to a stated user choice, such as newest-first tasks (Q008), explicit resume after refresh (Q018), the daily budget (Q026), and matching the displayed export range (Q038). Temporal items ask about a date, duration, elapsed-time rule, or time range; a mere sequence of implementation changes was not enough for that label.

The multi-session items are Q048–Q060. Their answers require the cited conversations together: for example, Q048 connects D1 editing/deletion to D2's saved title snapshot, Q049 connects D1 completion controls to D3 progress, Q055 connects D2's retained history to D4's immediate refresh, and Q059 combines the historical title snapshot with CSV punctuation handling. The 23 multihop items require combining facts; `question-dependencies.json` separately records answer dependencies without changing the required combined-file fields.

The browser defect reports remain in the conversation as originally stated. Answers about the final behavior cite the later repair rather than silently replacing the earlier observation: Q021–Q023 cover the missing module and fix, Q032–Q035 cover stale saved-plan IDs and cleanup, and Q041–Q045 cover stale Insights and the later export-message correction. The question set does not claim that the final browser CSV verification appeared inside D4; that check is documented separately in the D4 evidence note.

Limits of review: a matching excerpt establishes what the original conversation said; it does not by itself prove app behavior. The separate tests, browser checks, screenshots, and downloaded CSV provide that evidence. The live hidden-page transition was not reproduced in the browser session; timer logic and recovery behavior were checked in source and tests.
