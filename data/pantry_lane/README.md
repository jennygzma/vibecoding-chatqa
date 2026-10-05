# Pantry Lane conversation dataset

Status: In Progress. Review approval pending.

This package contains four original feature conversations, 94 public messages and exactly 50 evidence-linked questions. `annotations.json` is the standalone question array; `vibe_combined.json` contains the same questions with the four conversations.

Read `conversation.md`, `annotations.md`, `category-review.md` and `timing-review.md` for the recorded work, semantic grounding and reference-format comparison. Original IDs and timestamps are retained in each D1–D4 source map; checksum manifests identify the original local archives. Public-message content and dataset JSON were copied without changes.

Run from the repository root:

```sh
python3 scripts/validate_pantry_lane.py
python3 scripts/test_pantry_lane.py
```

Repository validation checks published file hashes, source-map/message consistency, sequential session boundaries, all exact excerpts, category arrays and dependencies. Full original archives and local capture helpers remain private. Their successful local replay is documented in the application evidence; repository validation does not claim to replay them.

The application is in [projects/pantry-lane](../../projects/pantry-lane/README.md). See its [review evidence](../../projects/pantry-lane/evidence/READY-FOR-REVIEW.md). Approval remains pending.
