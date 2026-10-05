import { isCalendarDate, isExpired, localDate, normalizeName } from "./inventory.mjs";
import { aggregateMenuDemand, entriesForWeek, validateWeekStart } from "./menu.mjs";
import { formatQuantity, quantityIsCovered, toBaseQuantity, unitDimension } from "./recipes.mjs";

export const SHOPPING_SNAPSHOT_VERSION = 1;

export class ShoppingError extends Error {}

const baseUnitForDimension = { mass: "g", volume: "ml", pieces: "pcs" };

function keyFor(normalizedName, dimension) {
  return `${normalizedName}\u0000${dimension}`;
}

function stableEntries(entries) {
  return [...entries].map((entry) => ({ ...entry })).toSorted((a, b) => `${a.date}\u0000${a.slot}`.localeCompare(`${b.date}\u0000${b.slot}`));
}

function stableInventory(inventory) {
  return [...inventory].map((item) => ({ ...item })).toSorted((a, b) => a.id.localeCompare(b.id));
}

function stableRecipes(recipes) {
  return [...recipes].map((recipe) => ({ ...recipe, ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient })), steps: [...recipe.steps] })).toSorted((a, b) => a.id.localeCompare(b.id));
}

export function shoppingDependencies({ weekStart, menuEntries, recipes, inventory, today }) {
  const start = validateWeekStart(weekStart);
  if (!isCalendarDate(today)) throw new ShoppingError("Use a real local calendar date for shopping planning.");
  const entries = stableEntries(entriesForWeek(menuEntries, start));
  const recipeIds = new Set(entries.map((entry) => entry.recipeId));
  const referencedRecipes = stableRecipes(recipes.filter((recipe) => recipeIds.has(recipe.id)));
  return JSON.stringify({ weekStart: start, today, entries, recipes: referencedRecipes, inventory: stableInventory(inventory) });
}

export function createShoppingSnapshot({ weekStart, menuEntries, recipes, inventory, now = new Date() }) {
  const today = localDate(now);
  const start = validateWeekStart(weekStart);
  const entries = entriesForWeek(menuEntries, start);
  const demand = aggregateMenuDemand(entries, recipes);
  if (demand.missingRecipeIds.length) throw new ShoppingError("This list cannot be generated because a planned meal refers to an unavailable recipe. Restore or replace that meal first.");
  const available = new Map();
  for (const item of inventory) {
    if (isExpired(item.expiryDate, today)) continue;
    const dimension = unitDimension(item.unit);
    if (!dimension) continue;
    const key = keyFor(item.normalizedName, dimension);
    available.set(key, (available.get(key) || 0) + toBaseQuantity(item.quantity, item.unit));
  }
  const items = demand.ingredients.map((ingredient) => {
    const stock = available.get(keyFor(ingredient.normalizedName, ingredient.dimension)) || 0;
    const shortfall = ingredient.quantity - stock;
    if (quantityIsCovered(ingredient.quantity, stock)) return null;
    return { name: ingredient.name, normalizedName: ingredient.normalizedName, dimension: ingredient.dimension, quantity: shortfall, unit: baseUnitForDimension[ingredient.dimension], purchased: false };
  }).filter(Boolean);
  return {
    version: SHOPPING_SNAPSHOT_VERSION,
    weekStart: start,
    generatedAt: now.toISOString(),
    generatedToday: today,
    dependencies: shoppingDependencies({ weekStart: start, menuEntries, recipes, inventory, today }),
    items,
  };
}

export function snapshotIsStale(snapshot, state, now = new Date()) {
  try {
    return snapshot.dependencies !== shoppingDependencies({ ...state, weekStart: snapshot.weekStart, today: localDate(now) });
  } catch {
    return true;
  }
}

export function validateShoppingSnapshot(input) {
  if (!input || input.version !== SHOPPING_SNAPSHOT_VERSION) throw new ShoppingError("Saved shopping snapshot uses an unsupported format.");
  const weekStart = validateWeekStart(input.weekStart);
  if (typeof input.generatedAt !== "string" || Number.isNaN(Date.parse(input.generatedAt))) throw new ShoppingError("Saved shopping snapshot is invalid.");
  if (!isCalendarDate(input.generatedToday) || typeof input.dependencies !== "string" || !input.dependencies) throw new ShoppingError("Saved shopping snapshot is invalid.");
  if (!Array.isArray(input.items)) throw new ShoppingError("Saved shopping snapshot is invalid.");
  const keys = new Set();
  const items = input.items.map((item) => {
    const name = normalizeName(item?.name);
    const normalizedName = normalizeName(item?.normalizedName).toLocaleLowerCase("en-US");
    const dimension = item?.dimension;
    if (!name || !normalizedName || !baseUnitForDimension[dimension] || item?.unit !== baseUnitForDimension[dimension] || !Number.isFinite(item?.quantity) || item.quantity <= 0 || typeof item?.purchased !== "boolean") throw new ShoppingError("Saved shopping snapshot is invalid.");
    const key = keyFor(normalizedName, dimension);
    if (keys.has(key)) throw new ShoppingError("Saved shopping snapshot contains duplicate ingredients.");
    keys.add(key);
    return { name, normalizedName, dimension, quantity: item.quantity, unit: item.unit, purchased: item.purchased };
  });
  return { version: SHOPPING_SNAPSHOT_VERSION, weekStart, generatedAt: input.generatedAt, generatedToday: input.generatedToday, dependencies: input.dependencies, items };
}

export function replaceShoppingSnapshot(snapshots, snapshot) {
  const valid = validateShoppingSnapshot(snapshot);
  return [...snapshots.filter((item) => item.weekStart !== valid.weekStart), valid].toSorted((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export function updatePurchased(snapshot, normalizedName, dimension, purchased) {
  if (typeof purchased !== "boolean") throw new ShoppingError("Choose whether this item has been purchased.");
  const key = keyFor(normalizedName, dimension);
  let found = false;
  const items = snapshot.items.map((item) => {
    if (keyFor(item.normalizedName, item.dimension) !== key) return item;
    found = true;
    return { ...item, purchased };
  });
  if (!found) throw new ShoppingError("That shopping item is no longer available.");
  return validateShoppingSnapshot({ ...snapshot, items });
}

export function escapeCsvCell(value) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function snapshotToCsv(snapshot) {
  const valid = validateShoppingSnapshot(snapshot);
  return ["Ingredient,Quantity,Unit,Purchased", ...valid.items.map((item) => [item.name, formatQuantity(item.quantity), item.unit, item.purchased ? "Yes" : "No"].map(escapeCsvCell).join(","))].join("\r\n") + "\r\n";
}
