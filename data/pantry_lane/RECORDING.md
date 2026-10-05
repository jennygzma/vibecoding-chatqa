# Pantry Lane recording notes

Status: In Progress. Review approval pending.

Each feature has its own original conversation. Follow-up fixes stay in that feature's conversation. Public messages are numbered chronologically within D1–D4, while source maps retain their original identities and timestamps. Session starts come from the earliest preserved manifest for that original conversation; a resumed turn may update the current manifest's start field.

Request timestamps use the original submission logs when available. The source map also retains the public history timestamp unchanged: a queued request can be persisted after the preceding reply even though it was submitted earlier. The export orders messages by the actual submission time and public reply times.

Raw sources remain byte-for-byte copies in each session's private `raw/` directory. SHA-256 manifests cover those copies. Exported conversation text removes only the outer request envelope. Public progress replies come from the matching original runtime records. Final replies come from the persisted public history, with runtime copies linked in the cleaning ledger. Non-public execution records remain in raw sources and are omitted from the conversation export.

D1's first submitted request is preserved in its original manifest and submission log. Its public history was empty before a local runtime recovery. The source map therefore uses a source locator and the real submission timestamp instead of inventing a message ID. The restored conversation keeps the same original session ID.

The public-history display omits a trailing auxiliary citation block found in some runtime copies. The ledger records this existing display transformation when matching final replies; raw copies remain intact. Internal task summaries are not original feature conversations or public development replies.

The combined JSON follows the supplied sample: paired session date/time and message arrays, per-session `dia_id` numbering, and question/category/evidence/answer fields. Original IDs, timestamps, checksums, question dependencies and individual semantic review live in companion files. Category labels may overlap. A category distribution comparison guides review but does not justify unsupported labels.

Raw archives and the local source registry are excluded from ordinary repository publication. Review the source-bearing package before any external sharing. The repository package includes public conversation exports and checksum manifests; full original archives remain local.
