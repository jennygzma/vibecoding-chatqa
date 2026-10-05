import { InventoryError, validateIngredient } from "./inventory.mjs";
import { RecipeError, validateRecipe } from "./recipes.mjs";
import { MenuError, menuEntryKey, validateMenuEntry } from "./menu.mjs";
import { ShoppingError, validateShoppingSnapshot } from "./shopping.mjs";

export const STORAGE_KEY = "pantry-lane.inventory";
export const SAVE_VERSION = 1;
export const RECIPE_STORAGE_KEY = "pantry-lane.recipes";
export const RECIPE_SAVE_VERSION = 1;
export const MENU_STORAGE_KEY = "pantry-lane.weekly-menu";
export const MENU_SAVE_VERSION = 1;
export const SHOPPING_STORAGE_KEY = "pantry-lane.shopping-snapshots";
export const SHOPPING_SAVE_VERSION = 1;

const memoryOnlyNotice = "Your current changes will remain on this page only.";

function unavailableStorage() {
  return {
    getItem() { throw new Error("Storage is unavailable"); },
    setItem() { throw new Error("Storage is unavailable"); },
  };
}

export function accessBrowserStorage(browserWindow) {
  try {
    return browserWindow.localStorage;
  } catch {
    return unavailableStorage();
  }
}

export function loadInventory(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], notice: null, allowWrite: true };
    const saved = JSON.parse(raw);
    if (!saved || saved.version !== SAVE_VERSION || !Array.isArray(saved.items)) {
      return {
        items: [],
        notice: `Saved inventory uses an unsupported format and cannot be replaced. ${memoryOnlyNotice}`,
        allowWrite: false,
      };
    }
    const items = saved.items.map((item) => validateIngredient(item, { id: item.id, now: new Date(item.updatedAt) }));
    return { items, notice: null, allowWrite: true };
  } catch (error) {
    const detail = error instanceof InventoryError ? "Saved inventory is invalid." : "Saved inventory could not be read.";
    return { items: [], notice: `${detail} ${memoryOnlyNotice}`, allowWrite: false };
  }
}

export function saveInventory(storage, items, { allowWrite = true, notice } = {}) {
  if (!allowWrite) return { ok: false, notice: notice || `Inventory cannot be saved locally. ${memoryOnlyNotice}` };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: SAVE_VERSION, items }));
    return { ok: true };
  } catch {
    return { ok: false, notice: `Inventory could not be saved locally. ${memoryOnlyNotice}` };
  }
}

export function loadRecipes(storage) {
  try {
    const raw = storage.getItem(RECIPE_STORAGE_KEY);
    if (!raw) return { items: [], notice: null, allowWrite: true };
    const saved = JSON.parse(raw);
    if (!saved || saved.version !== RECIPE_SAVE_VERSION || !Array.isArray(saved.recipes)) {
      return { items: [], notice: `Saved recipes use an unsupported format and cannot be replaced. ${memoryOnlyNotice}`, allowWrite: false };
    }
    return { items: saved.recipes.map((recipe) => validateRecipe(recipe, { id: recipe.id, now: new Date(recipe.updatedAt) })), notice: null, allowWrite: true };
  } catch (error) {
    const detail = error instanceof RecipeError ? "Saved recipes are invalid." : "Saved recipes could not be read.";
    return { items: [], notice: `${detail} ${memoryOnlyNotice}`, allowWrite: false };
  }
}

export function saveRecipes(storage, recipes, { allowWrite = true, notice } = {}) {
  if (!allowWrite) return { ok: false, notice: notice || `Recipes cannot be saved locally. ${memoryOnlyNotice}` };
  try {
    storage.setItem(RECIPE_STORAGE_KEY, JSON.stringify({ version: RECIPE_SAVE_VERSION, recipes }));
    return { ok: true };
  } catch {
    return { ok: false, notice: `Recipes could not be saved locally. ${memoryOnlyNotice}` };
  }
}

export function loadMenu(storage) {
  try {
    const raw = storage.getItem(MENU_STORAGE_KEY);
    if (!raw) return { items: [], notice: null, allowWrite: true };
    const saved = JSON.parse(raw);
    if (!saved || saved.version !== MENU_SAVE_VERSION || !Array.isArray(saved.entries)) {
      return { items: [], notice: `Saved weekly menu uses an unsupported format and cannot be replaced. ${memoryOnlyNotice}`, allowWrite: false };
    }
    const items = saved.entries.map(validateMenuEntry);
    const keys = new Set();
    for (const entry of items) {
      const key = menuEntryKey(entry);
      if (keys.has(key)) throw new MenuError("Saved weekly menu contains duplicate date and meal slots.");
      keys.add(key);
    }
    return { items, notice: null, allowWrite: true };
  } catch (error) {
    const detail = error instanceof MenuError ? "Saved weekly menu is invalid." : "Saved weekly menu could not be read.";
    return { items: [], notice: `${detail} ${memoryOnlyNotice}`, allowWrite: false };
  }
}

export function saveMenu(storage, entries, { allowWrite = true, notice } = {}) {
  if (!allowWrite) return { ok: false, notice: notice || `Weekly menu cannot be saved locally. ${memoryOnlyNotice}` };
  try {
    storage.setItem(MENU_STORAGE_KEY, JSON.stringify({ version: MENU_SAVE_VERSION, entries }));
    return { ok: true };
  } catch {
    return { ok: false, notice: `Weekly menu could not be saved locally. ${memoryOnlyNotice}` };
  }
}

export function loadShoppingSnapshots(storage) {
  try {
    const raw = storage.getItem(SHOPPING_STORAGE_KEY);
    if (!raw) return { items: [], notice: null, allowWrite: true };
    const saved = JSON.parse(raw);
    if (!saved || saved.version !== SHOPPING_SAVE_VERSION || !Array.isArray(saved.snapshots)) {
      return { items: [], notice: `Saved shopping lists use an unsupported format and cannot be replaced. ${memoryOnlyNotice}`, allowWrite: false };
    }
    const items = saved.snapshots.map(validateShoppingSnapshot);
    const weeks = new Set();
    for (const snapshot of items) {
      if (weeks.has(snapshot.weekStart)) throw new ShoppingError("Saved shopping lists contain duplicate weeks.");
      weeks.add(snapshot.weekStart);
    }
    return { items, notice: null, allowWrite: true };
  } catch (error) {
    const detail = error instanceof ShoppingError ? "Saved shopping lists are invalid." : "Saved shopping lists could not be read.";
    return { items: [], notice: `${detail} ${memoryOnlyNotice}`, allowWrite: false };
  }
}

export function saveShoppingSnapshots(storage, snapshots, { allowWrite = true, notice } = {}) {
  if (!allowWrite) return { ok: false, notice: notice || `Shopping lists cannot be saved locally. ${memoryOnlyNotice}` };
  try {
    storage.setItem(SHOPPING_STORAGE_KEY, JSON.stringify({ version: SHOPPING_SAVE_VERSION, snapshots }));
    return { ok: true };
  } catch {
    return { ok: false, notice: `Shopping lists could not be saved locally. ${memoryOnlyNotice}` };
  }
}
