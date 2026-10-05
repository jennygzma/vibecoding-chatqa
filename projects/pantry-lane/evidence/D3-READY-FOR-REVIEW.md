# Ready for Review — Pantry Lane D3 weekly menu

**Status:** In Progress
**Reviewer:** @Andy Chen
**Approval:** Pending

Pantry Lane's third feature adds a Monday-based weekly menu while retaining the Inventory and Recipes views. Each selected week displays all seven dated days with breakfast, lunch, and dinner slots. A slot can hold one saved recipe and a positive whole-number serving count; planned meals can be added, edited to replace their recipe or servings, and removed. Different weeks remain independent.

## Local revision

PR/commit: none. This local workspace is intentionally uncommitted and must not be published before review.

## Verification completed

- `npm test` — 25 passing Node behavior and layout-regression tests; see `evidence/D3-test-results.txt`.
  - October 5–11, 2026 resolves to the required Monday-start week and all seven real calendar dates.
  - Tomato pasta scheduled for Monday dinner at four servings and Wednesday lunch at two servings produces the current recipe-derived total: Pasta `600 g`, Tomatoes `900 g`, and Olive oil `60 ml`.
  - Menu entries retain only week/date/slot, `recipeId`, and servings. Recipe edits immediately change derived menu recipe names and ingredient demand without copying ingredients into the menu.
  - Aggregation follows the established case-insensitive ingredient-name and same-dimension unit rules. Existing fractional comparison and quantity-formatting coverage remains passing.
  - A recipe with one or more menu references cannot be removed; the interface explains that its planned entries must be removed first.
  - Menu planning never updates pantry quantities.
  - Valid menu saves reload. Malformed, blocked, unsupported, and duplicate date-and-slot saves remain protected from replacement while current-page work stays usable in memory.
  - Inventory and recipe regression checks and the menu browser-module registration check pass.
- `npm run check` — passed syntax checks for all browser and domain modules.
- The narrow-layout regression test confirms that the menu board can shrink, phone week controls become one column, navigation wraps, and day cards use an adaptive grid below 500px. Desktop retains seven day columns.

## Supplied browser verification

The supplied local browser pass on port 4184 verified the October 5–11, 2026 week: seven dated days, Monday dinner Tomato pasta at four servings, and Wednesday lunch Tomato pasta at two servings. Duplicate slots, edits into occupied slots, and zero servings were rejected without changing the plan. Editing servings changed demand; changing and restoring the referenced recipe name and Pasta amount updated menu text and demand immediately. Recipe removal was blocked with the expected instruction, both temporary-meal removal dialog choices worked, reload retained the two original meals, October 12–18 was empty and independent, and Inventory retained its three original stock items.

`evidence/D3-desktop.png` and `evidence/D3-dom.txt` record that functional pass. The original failing narrow-layout capture remains preserved in `evidence/D3-mobile-before-repair.png`, with `evidence/D3-layout-regression.json` recording its `1293px` document width at a `390px` viewport.

## Completed narrow-layout recheck

The supplied post-repair browser recheck at a `390px` viewport passed: document `scrollWidth` is `390px`, the menu panel is `358px` wide, and all seven days remain available. The week controls and navigation fit within the narrow viewport, and the day cards stack. `evidence/D3-mobile.png` and `evidence/D3-mobile-viewport.png` are the passing mobile screenshots; `evidence/D3-desktop.png` is the corresponding desktop capture. `evidence/D3-browser-checks.json` records the completed functional pass and the passing recheck.

The feature remains In Progress; review approval is pending.
