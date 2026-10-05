# Ready for Review — Pantry Lane D2 recipes

**Status:** In Progress
**Reviewer:** @Andy Chen
**Approval:** Pending

Pantry Lane's second feature is limited to browser-local recipes. Recipes support name, positive base servings, ingredient quantities and units, written steps, cooking minutes, add/edit/search, and confirmed deletion. Clear Inventory and Recipes navigation retains the D1 inventory form, search, combined filters, edit/remove dialog, and storage protection alongside recipes. Inventory changes immediately re-render recipe availability without a refresh.

## Local revision

PR/commit: none. This local workspace is intentionally uncommitted and must not be published before review.

## Verification completed

- `npm test` — 17 passing Node behavior tests; see `evidence/D2-test-results.txt`.
  - Repeated recipe ingredients are totaled before comparison.
  - Mass (`g`/`kg`) and volume (`ml`/`L`) convert only within their own dimension; `pcs` stays separate.
  - Availability ignores expired stock and matching-name stock from another dimension.
  - Fractional equality is compared with a magnitude-relative floating-point tolerance, so `0.1 g + 0.2 g` correctly satisfies `0.3 g`; a real `0.000001 g` shortage remains visible.
  - A positive `1e-16 g` requirement with zero stock is short, and `0.0001` formats as `0.0001` rather than `0`.
  - Scaling and availability do not mutate pantry inventory quantities.
  - Regression coverage confirms D1 inventory entrypoints and its current inventory-to-recipe availability wiring remain present.
  - Malformed, blocked, and future-version recipe storage stays protected from replacement while the current page remains usable in memory.
- `npm run check` — passed syntax checks for the inventory, recipe, storage, server, and browser modules.
- Static route check — passed: the port-4184 server registers the combined page and every imported browser module, including `/src/inventory.mjs` and `/src/recipes.mjs`.

## Browser verification completed

Browser checks were completed against `http://127.0.0.1:4184/`; the detailed record is `evidence/D2-browser-checks.json`.

- Inventory and Recipes were both usable.
- Tomato pasta saved with the requested two-serving baseline. At four servings, the pantry check showed Pasta `400 g` needed / `250 g` available / `150 g` short; Tomatoes `600 g` needed / `150 g` available / `450 g` short; and Olive oil `40 ml` needed / `100 ml` available.
- Editing Pasta from `0.25 kg` to `0.5 kg` immediately changed availability to `500 g` without refresh; the item was restored to `0.25 kg`.
- Recipe editing, case-insensitive search, retaining Tomato pasta with Keep it, confirmed removal of the disposable Test toast recipe, and refresh recovery passed.
- `evidence/D2-desktop.png` and `evidence/D2-mobile.png` capture the desktop and narrow layouts. At a 390-pixel viewport, `scrollWidth` was 390, with no horizontal overflow.

The feature remains In Progress; review approval is pending.
