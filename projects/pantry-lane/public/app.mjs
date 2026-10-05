import { InventoryError, STORAGE_LOCATIONS, UNITS, filterIngredients, isExpired, localDate, localDateChanged, updateIngredient, validateIngredient } from "/src/inventory.mjs";
import { RecipeError, assessRecipeAvailability, filterRecipes, formatQuantity, updateRecipe, validateRecipe } from "/src/recipes.mjs";
import { MEAL_SLOTS, SLOT_LABELS, MenuError, addMenuEntry, aggregateMenuDemand, entriesForWeek, formatMenuDate, menuEntriesForRecipe, menuEntryKey, removeMenuEntry, updateMenuEntry, validateWeekStart, weekDates, weekStartForDate } from "/src/menu.mjs";
import { ShoppingError, createShoppingSnapshot, replaceShoppingSnapshot, snapshotIsStale, snapshotToCsv, updatePurchased } from "/src/shopping.mjs";
import { accessBrowserStorage, loadInventory, loadMenu, loadRecipes, loadShoppingSnapshots, saveInventory, saveMenu, saveRecipes, saveShoppingSnapshots } from "/src/storage.mjs";

const $ = (id) => document.getElementById(id);
const storage = accessBrowserStorage(window);
const inventoryState = loadInventory(storage);
const recipeState = loadRecipes(storage);
const menuState = loadMenu(storage);
const shoppingState = loadShoppingSnapshots(storage);
let inventory = inventoryState.items;
let recipes = recipeState.items;
let menuEntries = menuState.items;
let shoppingSnapshots = shoppingState.items;
let selectedWeek = weekStartForDate(localDate());
let displayedLocalDate = localDate();
let pendingDelete = null;

function announce(message, type = "info") { $("notice").textContent = message || ""; $("notice").hidden = !message; $("notice").dataset.type = type; }
function actionButton(text, className, handler) { const button = document.createElement("button"); button.type = "button"; button.className = className; button.textContent = text; button.addEventListener("click", handler); return button; }
function options(select, values, placeholder, selected = "") { select.replaceChildren(new Option(placeholder, "")); values.forEach((value) => select.append(new Option(value, value))); select.value = selected; }
function persistInventory() { const result = saveInventory(storage, inventory, inventoryState); if (!result.ok) announce(result.notice, "error"); return result.ok; }
function persistRecipes() { const result = saveRecipes(storage, recipes, recipeState); if (!result.ok) announce(result.notice, "error"); return result.ok; }
function persistMenu() { const result = saveMenu(storage, menuEntries, menuState); if (!result.ok) announce(result.notice, "error"); return result.ok; }
function persistShopping() { const result = saveShoppingSnapshots(storage, shoppingSnapshots, shoppingState); if (!result.ok) announce(result.notice, "error"); return result.ok; }

function showView(view, { updateHash = true } = {}) {
  const activeView = ["inventory", "recipes", "menu", "shopping"].includes(view) ? view : "inventory";
  ["inventory", "recipes", "menu", "shopping"].forEach((name) => {
    const active = name === activeView;
    $(`${name}-view`).hidden = !active;
    const button = document.querySelector(`[data-view="${name}"]`);
    button.setAttribute("aria-selected", String(active));
    button.classList.toggle("active", active);
  });
  if (updateHash && window.location.hash !== `#${activeView}`) window.history.replaceState(null, "", `#${activeView}`);
  if (activeView === "shopping") renderShopping();
}

function renderInventory() {
  const visible = filterIngredients(inventory, { search: $("inventory-search").value, storage: $("inventory-storage-filter").value, expiry: $("inventory-expiry-filter").value });
  $("inventory-count").textContent = `${visible.length} ${visible.length === 1 ? "ingredient" : "ingredients"}`;
  const list = $("inventory-list"); list.replaceChildren();
  if (!visible.length) { const empty = document.createElement("li"); empty.className = "empty-state"; empty.textContent = inventory.length ? "No ingredients match those filters." : "Your pantry is empty. Add your first ingredient here."; list.append(empty); return; }
  visible.forEach((item) => {
    const row = document.createElement("li"); row.className = "inventory-item";
    const info = document.createElement("div"); const title = document.createElement("h3"); title.textContent = item.name;
    const details = document.createElement("p"); details.className = "item-details"; details.textContent = `${formatQuantity(item.quantity)} ${item.unit} · ${item.storage}`;
    const expiry = document.createElement("p"); expiry.className = `expiry ${isExpired(item.expiryDate) ? "expired" : ""}`; expiry.textContent = item.expiryDate ? (isExpired(item.expiryDate) ? `Expired ${item.expiryDate}` : `Expires ${item.expiryDate}`) : "No expiry date";
    info.append(title, details, expiry);
    const actions = document.createElement("div"); actions.className = "row-actions"; actions.append(actionButton("Edit", "quiet compact", () => beginInventoryEdit(item)), actionButton("Remove", "danger compact", () => askDelete("inventory", item)));
    row.append(info, actions); list.append(row);
  });
}
function resetInventoryForm() { $("inventory-form").reset(); $("inventory-editing-id").value = ""; $("inventory-form-title").textContent = "Add an ingredient"; $("inventory-submit-button").textContent = "Add ingredient"; $("inventory-cancel-edit").hidden = true; }
function beginInventoryEdit(item) { $("inventory-editing-id").value = item.id; $("inventory-name").value = item.name; $("inventory-quantity").value = item.quantity; $("inventory-unit").value = item.unit; $("inventory-storage").value = item.storage; $("inventory-expiry-date").value = item.expiryDate || ""; $("inventory-form-title").textContent = `Edit ${item.name}`; $("inventory-submit-button").textContent = "Save changes"; $("inventory-cancel-edit").hidden = false; announce(""); $("inventory-name").focus(); }

function ingredientRow(ingredient = {}) {
  const row = document.createElement("div"); row.className = "ingredient-row";
  const name = document.createElement("input"); name.className = "recipe-ingredient-name"; name.placeholder = "Ingredient name"; name.maxLength = 80; name.value = ingredient.name || ""; name.setAttribute("aria-label", "Ingredient name");
  const quantity = document.createElement("input"); quantity.className = "recipe-ingredient-quantity"; quantity.type = "number"; quantity.min = "0.001"; quantity.step = "any"; quantity.inputMode = "decimal"; quantity.placeholder = "Qty"; quantity.value = ingredient.quantity ?? ""; quantity.setAttribute("aria-label", "Ingredient quantity");
  const unit = document.createElement("select"); unit.className = "recipe-ingredient-unit"; unit.setAttribute("aria-label", "Ingredient unit"); options(unit, UNITS, "Unit", ingredient.unit);
  row.append(name, quantity, unit, actionButton("Remove", "quiet compact remove-ingredient", () => { row.remove(); if (!$("ingredient-rows").children.length) ingredientRow(); })); $("ingredient-rows").append(row);
}
function readIngredients() { return [...document.querySelectorAll(".ingredient-row")].map((row) => ({ name: row.querySelector(".recipe-ingredient-name").value, quantity: row.querySelector(".recipe-ingredient-quantity").value, unit: row.querySelector(".recipe-ingredient-unit").value })); }
function requirementLine(item) { const line = document.createElement("li"); line.className = item.enough ? "availability-line" : "availability-line short"; const available = `${formatQuantity(item.available)} ${item.unit} available`; line.textContent = item.enough ? `${item.name}: ${formatQuantity(item.quantity)} ${item.unit} needed · ${available}` : `${item.name}: ${formatQuantity(item.quantity)} ${item.unit} needed · ${available} · short ${formatQuantity(item.shortfall)} ${item.unit}`; return line; }
function renderRecipe(recipe) {
  const card = document.createElement("li"); card.className = "recipe-card";
  const heading = document.createElement("div"); heading.className = "recipe-heading"; const title = document.createElement("h3"); title.textContent = recipe.name; const metadata = document.createElement("p"); metadata.textContent = `${recipe.baseServings} base servings · ${recipe.cookingMinutes} min`; heading.append(title, metadata);
  const actions = document.createElement("div"); actions.className = "row-actions"; actions.append(actionButton("Edit", "quiet compact", () => beginRecipeEdit(recipe)), actionButton("Remove", "danger compact", () => askDelete("recipe", recipe))); card.append(heading, actions);
  const ingredients = document.createElement("p"); ingredients.className = "recipe-ingredients"; ingredients.textContent = recipe.ingredients.map((item) => `${item.quantity} ${item.unit} ${item.name}`).join(" · ");
  const steps = document.createElement("ol"); steps.className = "steps"; recipe.steps.forEach((step) => { const line = document.createElement("li"); line.textContent = step; steps.append(line); });
  const check = document.createElement("section"); check.className = "pantry-check"; check.setAttribute("aria-label", `Pantry check for ${recipe.name}`); const label = document.createElement("label"); label.className = "servings-control"; label.textContent = "Servings to cook"; const servings = document.createElement("input"); servings.type = "number"; servings.min = "1"; servings.step = "1"; servings.value = recipe.baseServings; servings.inputMode = "numeric"; servings.setAttribute("aria-label", `Servings to cook for ${recipe.name}`); label.append(servings);
  const summary = document.createElement("p"); summary.className = "availability-summary"; const list = document.createElement("ul"); list.className = "availability-list";
  const updateCheck = () => { try { const result = assessRecipeAvailability(recipe, servings.value, inventory); summary.textContent = result.enough ? `Your usable pantry is enough for ${result.servings} servings.` : `Your usable pantry is short for ${result.servings} servings.`; summary.dataset.enough = String(result.enough); list.replaceChildren(...result.ingredients.map(requirementLine)); } catch (error) { summary.textContent = error instanceof RecipeError ? error.message : "Choose valid servings."; summary.dataset.enough = "false"; list.replaceChildren(); } };
  servings.addEventListener("input", updateCheck); updateCheck(); check.append(label, summary, list); card.append(ingredients, steps, check); return card;
}
function renderRecipes() { const visible = filterRecipes(recipes, $("recipe-search").value); $("recipe-count").textContent = `${visible.length} ${visible.length === 1 ? "recipe" : "recipes"}`; const list = $("recipe-list"); list.replaceChildren(); if (!visible.length) { const empty = document.createElement("li"); empty.className = "empty-state"; empty.textContent = recipes.length ? "No recipes match that search." : "Your recipe collection is empty. Add your first recipe here."; list.append(empty); return; } visible.forEach((recipe) => list.append(renderRecipe(recipe))); }
function resetRecipeForm() { $("recipe-form").reset(); $("recipe-editing-id").value = ""; $("ingredient-rows").replaceChildren(); ingredientRow(); $("recipe-form-title").textContent = "Add a recipe"; $("recipe-submit-button").textContent = "Save recipe"; $("recipe-cancel-edit").hidden = true; }
function beginRecipeEdit(recipe) { $("recipe-editing-id").value = recipe.id; $("recipe-name").value = recipe.name; $("base-servings").value = recipe.baseServings; $("cooking-minutes").value = recipe.cookingMinutes; $("steps").value = recipe.steps.join("\n"); $("ingredient-rows").replaceChildren(); recipe.ingredients.forEach(ingredientRow); $("recipe-form-title").textContent = `Edit ${recipe.name}`; $("recipe-submit-button").textContent = "Save changes"; $("recipe-cancel-edit").hidden = false; announce(""); $("recipe-name").focus(); }

function recipeOptions(selected = "") {
  const select = $("menu-recipe"); select.replaceChildren(new Option("Choose a saved recipe", ""));
  filterRecipes(recipes).forEach((recipe) => select.append(new Option(recipe.name, recipe.id)));
  select.value = selected;
}
function dateOptions(selected = "") {
  const select = $("menu-date"); select.replaceChildren();
  weekDates(selectedWeek).forEach((date) => select.append(new Option(formatMenuDate(date), date)));
  select.value = weekDates(selectedWeek).includes(selected) ? selected : weekDates(selectedWeek)[0];
}
function resetMenuForm({ date, slot = "" } = {}) {
  $("menu-form").reset(); $("menu-editing-key").value = ""; dateOptions(date); recipeOptions(); $("menu-slot").value = slot;
  $("menu-form-title").textContent = "Add a planned meal"; $("menu-submit-button").textContent = "Add meal"; $("menu-cancel-edit").hidden = true;
}
function beginMenuAdd(date, slot) { resetMenuForm({ date, slot }); announce(""); $("menu-recipe").focus(); }
function beginMenuEdit(entry) {
  $("menu-editing-key").value = menuEntryKey(entry); dateOptions(entry.date); recipeOptions(entry.recipeId); $("menu-slot").value = entry.slot; $("menu-servings").value = entry.servings;
  $("menu-form-title").textContent = "Edit planned meal"; $("menu-submit-button").textContent = "Save changes"; $("menu-cancel-edit").hidden = false; announce(""); $("menu-recipe").focus();
}
function shiftWeek(amount) { const date = new Date(`${selectedWeek}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + amount * 7); setSelectedWeek(date.toISOString().slice(0, 10)); }
function setSelectedWeek(value) { selectedWeek = validateWeekStart(value); $("week-start").value = selectedWeek; $("shopping-week-start").value = selectedWeek; resetMenuForm(); renderMenu(); renderShopping(); }
function renderMenu() {
  const selectedRecipe = $("menu-recipe").value; recipeOptions(selectedRecipe); const entries = entriesForWeek(menuEntries, selectedWeek); const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  $("week-start").value = selectedWeek; const dates = weekDates(selectedWeek); $("week-range").textContent = `${formatMenuDate(dates[0])} – ${formatMenuDate(dates[6])}`; $("menu-count").textContent = `${entries.length} ${entries.length === 1 ? "planned meal" : "planned meals"}`;
  const grid = $("week-grid"); grid.replaceChildren();
  dates.forEach((date) => {
    const card = document.createElement("section"); card.className = "day-card"; const title = document.createElement("h3"); title.textContent = formatMenuDate(date); card.append(title);
    MEAL_SLOTS.forEach((slot) => {
      const cell = document.createElement("div"); cell.className = "meal-slot"; const label = document.createElement("p"); label.className = "meal-slot-label"; label.textContent = SLOT_LABELS[slot]; cell.append(label);
      const entry = entries.find((item) => item.date === date && item.slot === slot);
      if (!entry) { const empty = document.createElement("p"); empty.className = "slot-empty"; empty.textContent = "No meal planned."; cell.append(empty, actionButton("Add meal", "quiet compact add-slot", () => beginMenuAdd(date, slot))); }
      else {
        const recipe = recipesById.get(entry.recipeId); const meal = document.createElement("p"); meal.className = "planned-meal"; meal.textContent = `${recipe?.name || "Unavailable recipe"} · ${entry.servings} ${entry.servings === 1 ? "serving" : "servings"}`;
        const actions = document.createElement("div"); actions.className = "row-actions"; actions.append(actionButton("Edit", "quiet compact", () => beginMenuEdit(entry)), actionButton("Remove", "danger compact", () => askDelete("menu", entry))); cell.append(meal, actions);
      }
      card.append(cell);
    });
    grid.append(card);
  });
  const demand = $("weekly-demand"); demand.replaceChildren(); const totals = aggregateMenuDemand(entries, recipes);
  if (!entries.length) { const empty = document.createElement("li"); empty.className = "empty-state"; empty.textContent = "No meals are planned for this week yet."; demand.append(empty); }
  else {
    totals.ingredients.forEach((ingredient) => { const line = document.createElement("li"); line.className = "demand-line"; line.textContent = `${ingredient.name}: ${formatQuantity(ingredient.quantity)} ${ingredient.unit}`; demand.append(line); });
    if (totals.missingRecipeIds.length) { const missing = document.createElement("li"); missing.className = "demand-line"; missing.textContent = "A planned entry refers to an unavailable recipe and is excluded from this total."; demand.append(missing); }
  }
}

function selectedShoppingSnapshot() { return shoppingSnapshots.find((snapshot) => snapshot.weekStart === selectedWeek) || null; }
function renderShopping() {
  $("shopping-week-start").value = selectedWeek;
  const dates = weekDates(selectedWeek);
  $("shopping-week-range").textContent = `${formatMenuDate(dates[0])} – ${formatMenuDate(dates[6])}`;
  const snapshot = selectedShoppingSnapshot();
  const list = $("shopping-items"); const meta = $("shopping-meta"); const stale = $("shopping-stale"); const exportButton = $("export-shopping");
  list.replaceChildren(); exportButton.disabled = !snapshot; stale.hidden = true;
  $("generate-shopping").textContent = snapshot ? "Regenerate list" : "Generate list";
  if (!snapshot) {
    meta.textContent = "No shopping snapshot has been generated for this week.";
    const empty = document.createElement("li"); empty.className = "empty-state"; empty.textContent = "Generate a list when you are ready to compare this week’s meals with today’s pantry."; list.append(empty); return;
  }
  const generated = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(snapshot.generatedAt));
  meta.textContent = `Generated ${generated} from pantry usable on ${snapshot.generatedToday}.`;
  if (snapshotIsStale(snapshot, { menuEntries, recipes, inventory })) { stale.hidden = false; stale.textContent = "This snapshot is stale because this week’s meals, referenced recipes, pantry, or local date changed. Its stored quantities and purchase checks remain until you regenerate it."; }
  if (!snapshot.items.length) {
    const empty = document.createElement("li"); empty.className = "empty-state"; empty.textContent = "Your usable pantry already covers this week."; list.append(empty); return;
  }
  snapshot.items.forEach((item) => {
    const row = document.createElement("li"); row.className = `shopping-item ${item.purchased ? "purchased" : ""}`;
    const check = document.createElement("input"); check.type = "checkbox"; check.checked = item.purchased; check.setAttribute("aria-label", `Purchased ${item.name}`);
    check.addEventListener("change", () => {
      try {
        shoppingSnapshots = replaceShoppingSnapshot(shoppingSnapshots, updatePurchased(snapshot, item.normalizedName, item.dimension, check.checked));
        const saved = persistShopping(); renderShopping(); announce(saved ? `${item.name} marked ${check.checked ? "purchased" : "not purchased"}.` : $("notice").textContent, saved ? "success" : "error");
      } catch (error) { announce(error instanceof ShoppingError ? error.message : "Purchase status could not be saved.", "error"); renderShopping(); }
    });
    const text = document.createElement("span"); text.textContent = `${item.name}: ${formatQuantity(item.quantity)} ${item.unit}`; row.append(check, text); list.append(row);
  });
}

function refreshExpiryDependentDisplays(now = new Date()) {
  if (!localDateChanged(displayedLocalDate, now)) return false;
  displayedLocalDate = localDate(now);
  renderInventory();
  renderRecipes();
  renderShopping();
  return true;
}

function generateShopping() {
  try {
    const snapshot = createShoppingSnapshot({ weekStart: selectedWeek, menuEntries, recipes, inventory });
    shoppingSnapshots = replaceShoppingSnapshot(shoppingSnapshots, snapshot);
    const saved = persistShopping(); renderShopping(); announce(saved ? "Shopping snapshot generated locally." : $("notice").textContent, saved ? "success" : "error");
  } catch (error) { announce(error instanceof ShoppingError ? error.message : "Shopping list could not be generated.", "error"); }
}

function exportShopping() {
  const snapshot = selectedShoppingSnapshot();
  if (!snapshot) return;
  const file = new Blob([snapshotToCsv(snapshot)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(file); const link = document.createElement("a"); link.href = url; link.download = `shopping-list-${snapshot.weekStart}.csv`; link.click(); URL.revokeObjectURL(url);
  announce("Shopping snapshot exported as CSV.", "success");
}

function askDelete(kind, item) {
  if (kind === "recipe" && menuEntriesForRecipe(menuEntries, item.id).length) { announce("This recipe is used by a weekly menu. Remove its planned menu entries first, then remove the recipe.", "error"); return; }
  pendingDelete = { kind, id: kind === "menu" ? menuEntryKey(item) : item.id, name: kind === "menu" ? `${SLOT_LABELS[item.slot]} on ${formatMenuDate(item.date)}` : item.name };
  $("delete-title").textContent = kind === "menu" ? "Remove this planned meal?" : `Remove ${kind === "recipe" ? "this recipe" : "this ingredient"}?`;
  $("delete-description").textContent = `${pendingDelete.name} will be removed from this device.`; $("confirm-delete").textContent = kind === "menu" ? "Remove meal" : kind === "recipe" ? "Remove recipe" : "Remove ingredient"; $("delete-dialog").showModal();
}

options($("inventory-unit"), UNITS, "Choose unit");
options($("inventory-storage"), STORAGE_LOCATIONS, "Choose storage");
options($("inventory-storage-filter"), STORAGE_LOCATIONS, "All locations", "all");
$("inventory-storage-filter").firstElementChild.value = "all";
document.querySelectorAll(".nav-link").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
window.addEventListener("hashchange", () => showView(window.location.hash.slice(1), { updateHash: false }));
$("inventory-form").addEventListener("submit", (event) => { event.preventDefault(); try { const input = Object.fromEntries(new FormData(event.currentTarget)); const editingId = $("inventory-editing-id").value; inventory = editingId ? updateIngredient(inventory, editingId, input) : [...inventory, validateIngredient(input)]; const saved = persistInventory(); renderInventory(); renderRecipes(); renderShopping(); resetInventoryForm(); announce(saved ? (editingId ? "Ingredient updated locally." : "Ingredient added locally.") : $("notice").textContent, saved ? "success" : "error"); } catch (error) { announce(error instanceof InventoryError ? error.message : "Ingredient could not be saved.", "error"); } });
$("inventory-cancel-edit").addEventListener("click", () => { resetInventoryForm(); announce(""); });
$("inventory-search").addEventListener("input", renderInventory); $("inventory-storage-filter").addEventListener("change", renderInventory); $("inventory-expiry-filter").addEventListener("change", renderInventory);
$("add-ingredient-row").addEventListener("click", () => ingredientRow());
$("recipe-form").addEventListener("submit", (event) => { event.preventDefault(); try { const input = { ...Object.fromEntries(new FormData(event.currentTarget)), ingredients: readIngredients() }; const editingId = $("recipe-editing-id").value; recipes = editingId ? updateRecipe(recipes, editingId, input) : [...recipes, validateRecipe(input)]; const saved = persistRecipes(); renderRecipes(); renderMenu(); renderShopping(); resetRecipeForm(); announce(saved ? (editingId ? "Recipe updated locally." : "Recipe saved locally.") : $("notice").textContent, saved ? "success" : "error"); } catch (error) { announce(error instanceof RecipeError ? error.message : "Recipe could not be saved.", "error"); } });
$("recipe-cancel-edit").addEventListener("click", () => { resetRecipeForm(); announce(""); }); $("recipe-search").addEventListener("input", renderRecipes);
$("previous-week").addEventListener("click", () => shiftWeek(-1)); $("next-week").addEventListener("click", () => shiftWeek(1));
$("week-start").addEventListener("change", (event) => { try { setSelectedWeek(event.currentTarget.value); announce(""); } catch (error) { event.currentTarget.value = selectedWeek; announce(error instanceof MenuError ? error.message : "Choose a valid Monday-based week.", "error"); } });
$("shopping-previous-week").addEventListener("click", () => shiftWeek(-1)); $("shopping-next-week").addEventListener("click", () => shiftWeek(1));
$("shopping-week-start").addEventListener("change", (event) => { try { setSelectedWeek(event.currentTarget.value); announce(""); } catch (error) { event.currentTarget.value = selectedWeek; announce(error instanceof MenuError ? error.message : "Choose a valid Monday-based week.", "error"); } });
$("generate-shopping").addEventListener("click", () => { if (selectedShoppingSnapshot()) $("regenerate-dialog").showModal(); else generateShopping(); });
$("export-shopping").addEventListener("click", exportShopping);
$("menu-form").addEventListener("submit", (event) => { event.preventDefault(); try { const input = { ...Object.fromEntries(new FormData(event.currentTarget)), weekStart: selectedWeek }; const originalKey = $("menu-editing-key").value; menuEntries = originalKey ? updateMenuEntry(menuEntries, originalKey, input) : addMenuEntry(menuEntries, input); const saved = persistMenu(); renderMenu(); renderShopping(); resetMenuForm(); announce(saved ? (originalKey ? "Planned meal updated locally." : "Planned meal added locally.") : $("notice").textContent, saved ? "success" : "error"); } catch (error) { announce(error instanceof MenuError ? error.message : "Planned meal could not be saved.", "error"); } });
$("menu-cancel-edit").addEventListener("click", () => { resetMenuForm(); announce(""); });
$("regenerate-dialog").addEventListener("close", () => { if ($("regenerate-dialog").returnValue === "confirm") generateShopping(); });
$("delete-dialog").addEventListener("close", () => { if ($("delete-dialog").returnValue === "confirm" && pendingDelete) { const removed = pendingDelete; if (removed.kind === "inventory") { inventory = inventory.filter((item) => item.id !== removed.id); const saved = persistInventory(); renderInventory(); renderRecipes(); renderShopping(); announce(saved ? `${removed.name} removed locally.` : $("notice").textContent, saved ? "success" : "error"); } else if (removed.kind === "recipe") { recipes = recipes.filter((recipe) => recipe.id !== removed.id); const saved = persistRecipes(); renderRecipes(); renderMenu(); renderShopping(); announce(saved ? `${removed.name} removed locally.` : $("notice").textContent, saved ? "success" : "error"); } else { try { menuEntries = removeMenuEntry(menuEntries, removed.id); const saved = persistMenu(); renderMenu(); renderShopping(); resetMenuForm(); announce(saved ? "Planned meal removed locally." : $("notice").textContent, saved ? "success" : "error"); } catch (error) { announce(error instanceof MenuError ? error.message : "Planned meal could not be removed.", "error"); } } } pendingDelete = null; });

if (inventoryState.notice || recipeState.notice || menuState.notice || shoppingState.notice) announce([inventoryState.notice, recipeState.notice, menuState.notice, shoppingState.notice].filter(Boolean).join(" "), "error");
resetInventoryForm(); resetRecipeForm(); resetMenuForm(); renderInventory(); renderRecipes(); renderMenu(); renderShopping(); showView(window.location.hash.slice(1), { updateHash: false });
window.setInterval(refreshExpiryDependentDisplays, 60_000);
window.addEventListener("focus", () => { refreshExpiryDependentDisplays(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refreshExpiryDependentDisplays(); });
