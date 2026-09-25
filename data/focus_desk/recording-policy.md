# Conversation reconstruction and provenance

Status: In Progress. Review approval pending.

The combined conversation includes every original user message, final reply, and public progress reply. The initial reconstruction restored 44 progress replies omitted from the earlier 18-message view. Private reasoning, tool calls/results, runtime metadata, and duplicate stream events remain in the raw logs; they are not presented as conversational user messages.

The history export is authoritative for user messages and final replies. Its timestamp records when the interface received the message. Each final reply is matched exactly to its original run-log counterpart; that counterpart's separate message ID and timestamp are retained in the cleaning ledger. Public progress replies use the run-log message ID, text, phase, physical line number, and original timestamp. Each run-log record is accounted for by either the source map or the cleaning ledger. No public reply is filtered because of mistakes or inconsistent statements.

Only the outer user-input envelope is removed. The source map lists that transformation for each affected message. No message text is rewritten. The session-start field uses `session.json.started_at`; the first-message time is a separate field. Messages are sorted by actual timestamp within their original session, with continuous D1–D4 numbering. Later review repairs remain in their original feature session even when they occur after D4.

`message-renumbering.json` maps every old dialogue ID to its new ID by immutable original message ID. Annotation source specifications use original message IDs, so inserting a recorded progress reply cannot silently retarget a quote. The combined schema remains unchanged; provenance, phases, timestamps, source locations, checksums, and exclusion reasons stay in separate files.

`revisions/before-repair/` preserves the previous deliverables and original raw-file checksums. Future original-session updates are added as new raw snapshot files rather than overwriting the existing archive. The validator confirms that every original archived file still matches its earlier checksum.
