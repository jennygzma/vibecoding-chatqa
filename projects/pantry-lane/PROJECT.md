# Pantry Lane

Status: In Progress. Review approval pending.

A local English kitchen application with four sequential feature conversations and exactly fifty evidence-linked annotations.

## Feature sequence

1. D1: Pantry inventory — add, edit, delete, search and filter ingredients; quantities, units, storage locations and optional expiry dates; local persistence.
2. D2: Recipes — names, base servings, ingredient quantities, steps and cooking minutes; availability from current pantry stock.
3. D3: Weekly menu — Monday-based weeks, breakfast/lunch/dinner entries, adjustable servings, edit/remove actions and aggregated weekly demand.
4. D4: Shopping list — subtract usable stock from scaled weekly demand, retain a generated snapshot, purchase checkboxes, stale-input warning, confirmed regeneration and CSV export.

Implement and verify each feature before opening the next original conversation. Keep fixes in that feature's conversation. Preserve original IDs, timestamps, roles, text, public progress replies and source checksums. Never invent feedback or edit recorded timestamps.

## Shared rules

Normalize ingredient names by trimming, collapsing whitespace and ignoring case. Units are g/kg, ml/L and pcs. Convert only within mass or volume; pieces are separate. Aggregate matching names and dimensions. No mass-volume conversion.

Expiry is a local calendar date. Stock expiring before today is unavailable; stock expiring today remains available. Quantities are nonnegative; recipe ingredient quantities and servings are positive. Recipe base servings and menu servings are positive integers. Empty and invalid inputs need clear feedback.

Recipe edits update derived menu demand. Block deletion of recipes referenced by menu entries, with an explanation to remove those entries first. Menus and shopping lists do not consume inventory. A generated shopping list is a stored snapshot. Later input changes prompt regeneration; replacing an existing list requires confirmation and clears purchase checks.

## Implementation and evidence

Use standard browser modules and Node's built-in test runner without external runtime dependencies. Separate domain logic, persistence and rendering. Bind the local server to 127.0.0.1. Default port: 4184; allow a PORT override.

Keep the interface responsive, English, keyboard accessible and visually polished, with warm cream, dark olive and restrained terracotta. Report damaged or unavailable local storage without silently claiming saves succeeded. Use literal text rendering for user content.

Keep source records separate from product files. Export the combined schema from ../conversation-review/recording-workflow.md. Deliver exactly fifty questions, with exact evidence and a separate semantic review. Reference label proportions are guidance rather than quotas.

Run meaningful behavior tests, syntax checks and actual desktop/narrow browser checks. Save test results and screenshots under evidence/. Keep status In Progress until review approval. Review notes start with Ready for Review; reviewer: @Andy Chen. Publish only the authorized repository package; do not edit other projects.
