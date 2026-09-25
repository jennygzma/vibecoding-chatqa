# Annotation content review

Status: In Progress. Review approval pending.

The reconstructed conversations contain 69 public messages across the same four original sessions. The 44 formerly omitted progress replies were restored; later D2 repair messages are included with their actual times. The full records were read before the revised 60 questions were finalized. Original mistakes, the initial start-title decision, the D4 fixture correction, and subsequent confirmations remain visible.

Every question has an individual source-support and category rationale in `annotation-semantic-review.json`. Its checksum binds that review to the exact current question, answer, citations, and labels. This establishes which version was reviewed; it does not turn semantic judgment into a programmatic guarantee.

Direct lookups Q010, Q022, Q035, Q036, and Q043 were reclassified. Q048, Q051, Q054, and Q055 were rewritten so the answer needs different facts from different sessions. Q050 was replaced with a distinct timezone-fixture question from the restored D4 commentary. Q058 now cites the explicit statement linking task estimates to workload. Q016 distinguishes the original end-title request, the initial start-title choice, and the later repair in the same D2 conversation.

There are 12 cross-session and 17 multihop questions. Each requires either a comparison between distinct sources, a before/after comparison, or a combination needed to answer the question. Merely adding citations does not determine these categories. The current distribution is documented in `category-review.md`. Closed answers are brief; the five open-domain answers each use one sentence.

The separate validator checks exact excerpts, source IDs, complete progress-message coverage, original checksums, recorded session starts, role/text preservation, cleaning ledgers, old-to-new numbering, schema, dependencies, and review-version checksums. Six corruption tests show that missing progress replies, incorrect session starts, missing ledger entries, rewritten quotes, and stale semantic review are rejected.

App behavior is independently supported by tests and browser checks. Historical implementation claims are not silently promoted into verified current facts. Review approval remains pending.
