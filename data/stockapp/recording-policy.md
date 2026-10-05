# Recording and reconstruction policy

Original Cline `.messages.json` archives are retained byte-for-byte under the
application's `evidence/raw/` directory; source maps link to their repository paths
and SHA-256 hashes. They are not duplicated or rewritten inside each D directory.

Every assistant text block and every user text block inside a `user_input`
envelope is retained, including public progress replies, mistakes and corrections.
The envelope and outer whitespace are removed using the existing Cline importer
policy. Tool payloads, unwrapped runtime context and other non-public records stay
in the original archive. The cleaning ledger accounts for every original content
block, including both retained and excluded records. Original roles, message IDs,
positions, block indices, timestamps and text hashes remain available in source maps.

The six folder boundaries correspond to six distinct source session IDs. No new
conversation is invented to obtain multi-session questions. The raw exports have
no explicit session-start metadata: combined `session_N_date_time` values use the
first recorded raw-message timestamp, and `started_at_utc` is null in the session
index. They are not fabricated session-creation times. Public-message timestamps
are kept independently, and historical local paths inside messages remain verbatim.

The master selects the canonical annotations.json once per project. Legacy
per-trajectory outputs, older drafts and duplicate combined representations are
excluded from the annotation count. Question dependency arrays are empty where a
question stands on its own cited evidence; no artificial dependency chain is added.
