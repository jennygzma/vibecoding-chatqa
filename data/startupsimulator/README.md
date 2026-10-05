# StartupSimulator dataset

Editorial status: agent-reviewed. Human approval of this revised set: pending.

The canonical set contains 31 questions, 77 exact
evidence excerpts and 969 public messages across six original Cline
sessions. Its structure follows [Focus Desk](../focus_desk/README.md).

- [Combined conversation and questions](vibe_combined.json): a one-project array with
  exactly `sample_id`, `dataset`, `num_sessions`, `conversation` and `qa`.
- [Questions](annotations.json), [readable questions and rationales](annotations.md),
  [conversation](conversation.md) and [session index](session-index.json).
- [Authored citation specification](annotation-spec.json), [semantic review](annotation-semantic-review.json),
  [categories](category-review.md) and [question dependencies](question-dependencies.json).
- D1–D6 contain complete cleaned public messages, source maps, cleaning ledgers and
  readable conversations. [Message renumbering](message-renumbering.json) maps each
  earlier trajectory's D1:N references to the combined D1–D6 namespace.
- [Recording and timing policy](recording-policy.md) and [timing review](timing-review.md).
- [Application](../../projects/startupsimulator/README.md).

From the repository root:

```sh
python3 scripts/michael_dataset.py startupsimulator
python3 scripts/michael_dataset.py startupsimulator --check
python3 -m unittest discover -s scripts -p test_michael_dataset.py
```

The specification and semantic review are authored inputs. Building resolves
original message IDs into citations and creates derived exports; it never
updates a review's checksum to bless an edited question automatically.

Earlier per-trajectory output.json files are preserved for traceability and are
excluded from the master in favor of this annotations.json. Their prior researcher
approvals do not transfer to rewritten questions. Historical implementation reports
remain reports; this dataset does not assert that every earlier feature survives
later rewrites or has been independently exercised in the current app.
