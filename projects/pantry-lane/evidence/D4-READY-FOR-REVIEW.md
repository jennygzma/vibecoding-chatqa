# Ready for Review — Pantry Lane D4 shopping list

**Status:** In Progress
**Reviewer:** @Andy Chen
**Approval:** Pending

Pantry Lane now includes a fourth Shopping list view alongside Inventory, Recipes, and Weekly menu. It uses the selected Monday-based week to generate a stored current-stock snapshot. The snapshot aggregates scaled planned-recipe demand, subtracts usable inventory once per normalized name and unit dimension, keeps g/kg, ml/L, and pcs separate, and omits covered ingredients. It never modifies inventory.

## Local revision

PR/commit: none. This local workspace is intentionally uncommitted and must not be published before review.

## Verification completed

- `npm test` — 35 passing Node behavior, persistence, route, responsive-layout, and retained-feature tests; see `evidence/D4-test-results.txt`.
  - The October 5–11, 2026 test week verifies scaled shopping arithmetic, same-dimension conversion, today-usable expiry, covered-item omission, and real small-shortage visibility.
  - A missing referenced recipe stops generation with no partial list.
  - Each weekly snapshot records its generated timestamp and local-date basis. It becomes visibly stale if its selected-week meals, referenced recipes, inventory, or local date changes, while its stored quantities and purchase checks remain unchanged until confirmed regeneration.
  - A local-date guard now refreshes expiry-dependent inventory, recipe-availability, and shopping-staleness displays only when the calendar date changes. The one-minute check, window-focus listener, and visible-document listener leave active forms and every persisted snapshot, purchase check, menu, and pantry value untouched when the date has not changed. The registered-focus regression invokes the captured listener with an event-like argument and confirms the refresh receives its default `Date` rather than that event.
  - Purchase checks persist per week, never alter inventory, and are cleared only by replacing that week’s list after confirmation. Cancel keeps the current snapshot.
  - Before generation, the view presents an empty prompt and disables CSV export. A generated zero-shortage snapshot says that the usable pantry already covers the week.
  - CSV export uses the displayed snapshot and the filename `shopping-list-YYYY-MM-DD.csv`; columns are Ingredient, Quantity, Unit, and Purchased with comma, quote, and newline escaping.
  - Invalid, duplicate, malformed, and future-version snapshot saves are protected from overwrite with the existing memory-only storage notice.
  - The page-level responsive regression confirms that the shopping snapshot header stacks its actions below the title at the 500-pixel phone breakpoint.
  - Inventory, Recipes, and Weekly menu regression tests remain passing; `/src/shopping.mjs` is registered with the local server.
- `npm run check` — passed syntax checks for every domain and browser module.

## Browser verification

A completed browser pass against `http://127.0.0.1:4184/` is recorded in `evidence/D4-browser-checks.json`, with desktop and 390-pixel mobile screenshots in `evidence/D4-desktop.png` and `evidence/D4-mobile.png`, plus the semantic DOM capture in `evidence/D4-dom.txt`.

- Before generation, the view showed the empty prompt and disabled CSV export.
- For the retained October 5–11 plan, generation showed Pasta 350 g and Tomatoes 750 g; covered Olive oil was omitted. Marking Pasta purchased persisted after reload.
- The downloaded `shopping-list-2026-10-05.csv`, retained as `evidence/D4-export-purchased.csv`, has the expected header and rows: Pasta 350 g Yes and Tomatoes 750 g No.
- A temporary Pasta stock increase marked the stored list stale without changing its 350 g value or purchase check. Cancel preserved both; confirmed regeneration produced 100 g and cleared checks.
- Expired stock was excluded, and a fully covered planned week showed the covered-pantry message. Temporary inventory, expiry, menu-serving, and recipe edits were restored after their checks.
- Menu changes and edits to a referenced recipe marked the snapshot stale without changing stored values. October 12–18 retained an independent empty snapshot, and returning to October 5 preserved its check.
- At 390 pixels, the recorded `width` and `scrollWidth` were both 390.

The completed pass did not wait for a real midnight. The local-date rollover path is therefore supported by the simulated next-local-day regression described above, not by an awaited live midnight. After this review update, the shopping-header actions were stacked below “What to buy” only at phone widths (500 pixels and below); desktop layout and data behavior are unchanged. The refreshed mobile screenshot was visually inspected after a fresh navigation loaded the final modules: viewport and document width are both 390 pixels, and the title remains above its actions. Stored quantities and purchase checks were retained. The prior unavailable browser connection was not retried.

The feature remains In Progress; review approval is pending.
