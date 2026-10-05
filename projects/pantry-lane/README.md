# Pantry Lane

A local kitchen workspace for pantry inventory, recipes, weekly meals and shopping. The interface and recorded feature conversations are in English. Status: **In Progress; review approval pending**.

## Run locally

Requires Node 22.13 or later. There are no external runtime dependencies and no installation step.

```sh
cd projects/pantry-lane
npm start
```

Open [Pantry Lane](http://127.0.0.1:4184/). Use `PORT=4185 npm start` to choose another port. Data belongs to the browser's origin; switching ports or browsers uses a different saved workspace. There is no account or cloud synchronization.

## Four features

| Conversation | Feature | Behavior |
| --- | --- | --- |
| D1 | Pantry inventory | Add, edit and confirm ingredient removal; combine name, storage and expiry filters. |
| D2 | Recipes | Save recipes, scale servings and compare aggregate ingredient requirements with usable stock. |
| D3 | Weekly menu | Plan breakfast, lunch and dinner in Monday-based weeks; derive total ingredient demand. |
| D4 | Shopping list | Save weekly shortage snapshots, check purchases, detect stale inputs, confirm regeneration and export CSV. |

Names ignore case and repeated whitespace. Mass converts between g/kg, volume between ml/L, and pcs stays separate. Stock expiring today remains usable; earlier expiry dates do not. Recipe ingredients and servings must be positive, and servings must be whole numbers. Viewing recipes, planning meals, generating lists and checking purchases leave pantry quantities unchanged.

Menu entries reference saved recipes, so recipe changes update derived demand. Remove the corresponding menu entries before deleting a referenced recipe. Shopping lists retain their quantities and checks when inputs change; a stale notice prompts explicit regeneration. Confirmed replacement clears that week's purchase checks. Shopping calculations use today's stock and expiry, including for a future menu week.

Each collection has independently guarded, versioned browser storage. Unreadable, duplicate or future-format records are preserved rather than overwritten. A visible notice explains when edits can only remain in memory; those edits cannot survive closing or reloading the page.

## Annotation package

The package contains exactly **50 questions**, exported in two equivalent forms:

- [annotations.json](../../data/pantry_lane/annotations.json): the question/category/evidence/answer array.
- [vibe_combined.json](../../data/pantry_lane/vibe_combined.json): one project with four conversations and the same 50 questions.
- [annotations.md](../../data/pantry_lane/annotations.md): readable questions, evidence and individual semantic-review notes.
- [conversation.md](../../data/pantry_lane/conversation.md): all 94 public messages, including development progress replies.
- [session-index.json](../../data/pantry_lane/session-index.json): four distinct original session identities and timestamps.
- [category review](../../data/pantry_lane/category-review.md) and [timing review](../../data/pantry_lane/timing-review.md): evidence coverage, reference comparison and timestamp interpretation.

Each D1–D4 folder includes its cleaned conversation, source map, cleaning ledger and raw checksum manifest. Private original source copies and the local capture registry are excluded from ordinary repository publication. [RECORDING.md](../../data/pantry_lane/RECORDING.md) explains source provenance and the first-request recovery exception.

## Verification

```sh
npm test
npm run check
python3 scripts/validate_dataset.py
python3 scripts/test_dataset_validation.py
```

Local source verification passed 35 application tests, all module syntax checks and 11 original-record validator tests. Repository validation separately checks exported-file checksums, public-message coverage, session boundaries, timestamp consistency, exact excerpts, categories and question dependencies. Its 10 regression tests reject inconsistent or altered exports. Full raw archives remain local and are not replayed by the repository validator. Semantic support is reviewed separately from structural checks.

Actual browser checks cover all four views, persistence, edits, dialogs, recipe scaling, menu integrity, stale snapshots, regeneration, purchase checks, CSV download and 390-pixel layouts. Clock rollover has a simulated local-day regression; an actual overnight browser observation was not performed.

See [Ready for Review](evidence/READY-FOR-REVIEW.md) for screenshots, results and evidence boundaries. The repository package is submitted for review; approval remains pending.
