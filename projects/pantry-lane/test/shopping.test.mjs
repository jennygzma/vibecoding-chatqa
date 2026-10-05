import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";
import { localDate, localDateChanged } from "../src/inventory.mjs";
import { validateRecipe } from "../src/recipes.mjs";
import { SHOPPING_SNAPSHOT_VERSION, ShoppingError, createShoppingSnapshot, escapeCsvCell, replaceShoppingSnapshot, snapshotIsStale, snapshotToCsv, updatePurchased, validateShoppingSnapshot } from "../src/shopping.mjs";
import { SHOPPING_SAVE_VERSION, SHOPPING_STORAGE_KEY, loadShoppingSnapshots, saveShoppingSnapshots } from "../src/storage.mjs";
import { ASSETS } from "../src/server.mjs";

class MemoryStorage { constructor() { this.values = new Map(); } getItem(key) { return this.values.get(key) || null; } setItem(key, value) { this.values.set(key, value); } }

const pasta = validateRecipe({ name: "Pasta", baseServings: 2, cookingMinutes: 20, steps: "Cook.", ingredients: [{ name: "Pasta", quantity: 0.5, unit: "kg" }, { name: "Olive oil", quantity: 200, unit: "ml" }, { name: "Egg", quantity: 2, unit: "pcs" }] }, { id: "pasta", now: new Date("2026-10-01T12:00:00Z") });
const soup = validateRecipe({ name: "Soup", baseServings: 1, cookingMinutes: 10, steps: "Simmer.", ingredients: [{ name: "Tomatoes", quantity: 1, unit: "kg" }, { name: "Milk", quantity: 0.5, unit: "L" }] }, { id: "soup", now: new Date("2026-10-01T12:00:00Z") });
const entries = [
  { weekStart: "2026-10-05", date: "2026-10-05", slot: "dinner", recipeId: "pasta", servings: 1 },
  { weekStart: "2026-10-05", date: "2026-10-07", slot: "lunch", recipeId: "soup", servings: 2 },
  { weekStart: "2026-10-12", date: "2026-10-12", slot: "dinner", recipeId: "pasta", servings: 2 },
];
const inventory = [
  { id: "pasta-kg", name: "Pasta", normalizedName: "pasta", quantity: 0.2, unit: "kg", storage: "Pantry", expiryDate: null, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
  { id: "pasta-g", name: "pasta", normalizedName: "pasta", quantity: 40, unit: "g", storage: "Pantry", expiryDate: null, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
  { id: "oil", name: "Olive oil", normalizedName: "olive oil", quantity: 0.1, unit: "L", storage: "Pantry", expiryDate: null, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
  { id: "egg", name: "Egg", normalizedName: "egg", quantity: 0, unit: "pcs", storage: "Refrigerator", expiryDate: null, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
  { id: "tomato", name: "Tomatoes", normalizedName: "tomatoes", quantity: 2, unit: "kg", storage: "Pantry", expiryDate: "2026-10-05", createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
  { id: "milk", name: "Milk", normalizedName: "milk", quantity: 0.4, unit: "L", storage: "Refrigerator", expiryDate: null, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
  { id: "expired", name: "Milk", normalizedName: "milk", quantity: 1, unit: "L", storage: "Refrigerator", expiryDate: "2026-10-04", createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
];
const snapshotState = { weekStart: "2026-10-05", menuEntries: entries, recipes: [pasta, soup], inventory };

test("shopping snapshots aggregate selected-week scaled demand, convert only by dimension, and keep today-expiring stock usable", () => {
  const snapshot = createShoppingSnapshot({ ...snapshotState, now: new Date("2026-10-05T16:30:00Z") });
  assert.equal(snapshot.weekStart, "2026-10-05"); assert.equal(snapshot.generatedToday, "2026-10-05");
  assert.deepEqual(snapshot.items.map((item) => [item.name, item.quantity, item.unit]), [["Egg", 1, "pcs"], ["Milk", 600, "ml"], ["Pasta", 10, "g"]]);
  assert.equal(snapshot.items.some((item) => item.name === "Olive oil"), false);
  assert.equal(snapshot.items.some((item) => item.name === "Tomatoes"), false);
  assert.equal(inventory[0].quantity, 0.2);
});

test("shopping retains actual small shortages but ignores fractional equality", () => {
  const withoutPasta = inventory.filter((item) => item.id !== "pasta-g" && item.id !== "pasta-kg");
  const equal = createShoppingSnapshot({ ...snapshotState, inventory: [...withoutPasta, { ...inventory.find((item) => item.id === "pasta-kg"), quantity: 0.25 }], now: new Date("2026-10-05T16:30:00Z") });
  assert.equal(equal.items.some((item) => item.name === "Pasta"), false);
  const short = createShoppingSnapshot({ ...snapshotState, inventory: [...withoutPasta, { ...inventory.find((item) => item.id === "pasta-kg"), quantity: 0.249999 }], now: new Date("2026-10-05T16:30:00Z") });
  assert.equal(short.items.find((item) => item.name === "Pasta").quantity > 0, true);
});

test("shopping refuses to create a partial list when a planned recipe is missing", () => {
  assert.throws(() => createShoppingSnapshot({ ...snapshotState, menuEntries: [{ ...entries[0], recipeId: "gone" }], now: new Date("2026-10-05T16:30:00Z") }), ShoppingError);
});

test("snapshots become stale for menu, referenced-recipe, inventory, and local-date changes while retaining their stored content", () => {
  const snapshot = createShoppingSnapshot({ ...snapshotState, now: new Date("2026-10-05T16:30:00Z") });
  assert.equal(snapshotIsStale(snapshot, snapshotState, new Date("2026-10-05T17:00:00Z")), false);
  assert.equal(snapshotIsStale(snapshot, { ...snapshotState, menuEntries: [{ ...entries[0], servings: 2 }, ...entries.slice(1)] }, new Date("2026-10-05T17:00:00Z")), true);
  assert.equal(snapshotIsStale(snapshot, { ...snapshotState, recipes: [{ ...pasta, updatedAt: "2026-10-05T17:00:00Z" }, soup] }, new Date("2026-10-05T17:00:00Z")), true);
  assert.equal(snapshotIsStale(snapshot, { ...snapshotState, inventory: [{ ...inventory[0], quantity: 0.1 }, ...inventory.slice(1)] }, new Date("2026-10-05T17:00:00Z")), true);
  assert.equal(snapshotIsStale(snapshot, snapshotState, new Date("2026-10-06T05:00:00Z")), true);
  assert.equal(snapshot.items.find((item) => item.name === "Pasta").quantity, 10);
});

test("a simulated new local day changes expiry-dependent planning only after the calendar date rolls over", () => {
  const beforeMidnight = new Date(2026, 9, 5, 23, 59);
  const afterMidnight = new Date(2026, 9, 6, 0, 1);
  const beforeDate = localDate(beforeMidnight);
  const snapshot = createShoppingSnapshot({ ...snapshotState, now: beforeMidnight });
  assert.equal(localDateChanged(beforeDate, beforeMidnight), false);
  assert.equal(localDateChanged(beforeDate, afterMidnight), true);
  assert.equal(snapshotIsStale(snapshot, snapshotState, beforeMidnight), false);
  assert.equal(snapshotIsStale(snapshot, snapshotState, afterMidnight), true);
  assert.equal(snapshot.items.find((item) => item.name === "Pasta").quantity, 10);
});

test("the registered focus listener refreshes with the clock instead of forwarding its event", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const app = fs.readFileSync(path.join(root, "public/app.mjs"), "utf8");
  const refreshStart = app.indexOf("function refreshExpiryDependentDisplays");
  const refreshEnd = app.indexOf("\nfunction generateShopping", refreshStart);
  const focusRegistration = app.match(/^window\.addEventListener\("focus", .+\);$/m)?.[0];
  assert.notEqual(refreshStart, -1); assert.notEqual(refreshEnd, -1); assert.ok(focusRegistration);
  const context = { window: { addEventListener(type, listener) { this[type] = listener; } } };
  vm.runInNewContext(`var displayedLocalDate = "2026-10-02"; var receivedNow; function localDateChanged(date, now) { receivedNow = now; return false; } function localDate(now) { return "2026-10-02"; } function renderInventory() {} function renderRecipes() {} function renderShopping() {}\n${app.slice(refreshStart, refreshEnd)}\n${focusRegistration}`, context);
  assert.doesNotThrow(() => context.window.focus({ type: "focus" }));
  assert.equal(Object.prototype.toString.call(context.receivedNow), "[object Date]");
});

test("purchase checks persist separately by week and a replacement clears them", () => {
  const first = createShoppingSnapshot({ ...snapshotState, now: new Date("2026-10-05T16:30:00Z") });
  const checked = updatePurchased(first, "pasta", "mass", true);
  const second = createShoppingSnapshot({ ...snapshotState, weekStart: "2026-10-12", now: new Date("2026-10-05T16:30:00Z") });
  const byWeek = replaceShoppingSnapshot(replaceShoppingSnapshot([], checked), second);
  assert.equal(byWeek.find((item) => item.weekStart === "2026-10-05").items.find((item) => item.name === "Pasta").purchased, true);
  assert.equal(byWeek.find((item) => item.weekStart === "2026-10-12").items.find((item) => item.name === "Pasta").purchased, false);
  const regenerated = replaceShoppingSnapshot(byWeek, createShoppingSnapshot({ ...snapshotState, now: new Date("2026-10-05T18:30:00Z") }));
  assert.equal(regenerated.find((item) => item.weekStart === "2026-10-05").items.find((item) => item.name === "Pasta").purchased, false);
});

test("shopping snapshot persistence preserves valid data and protects malformed, duplicate, and future data without overwriting it", () => {
  const storage = new MemoryStorage(); const snapshot = createShoppingSnapshot({ ...snapshotState, now: new Date("2026-10-05T16:30:00Z") });
  assert.equal(saveShoppingSnapshots(storage, [snapshot]).ok, true); assert.deepEqual(loadShoppingSnapshots(storage).items, [snapshot]);
  storage.setItem(SHOPPING_STORAGE_KEY, "{"); assert.equal(loadShoppingSnapshots(storage).allowWrite, false);
  const future = JSON.stringify({ version: SHOPPING_SAVE_VERSION + 1, snapshots: [] }); storage.setItem(SHOPPING_STORAGE_KEY, future);
  let loaded = loadShoppingSnapshots(storage); assert.equal(loaded.allowWrite, false); assert.equal(saveShoppingSnapshots(storage, [snapshot], loaded).ok, false); assert.equal(storage.getItem(SHOPPING_STORAGE_KEY), future);
  const duplicateWeek = JSON.stringify({ version: SHOPPING_SAVE_VERSION, snapshots: [snapshot, snapshot] }); storage.setItem(SHOPPING_STORAGE_KEY, duplicateWeek);
  loaded = loadShoppingSnapshots(storage); assert.equal(loaded.allowWrite, false); assert.equal(saveShoppingSnapshots(storage, [snapshot], loaded).ok, false); assert.equal(storage.getItem(SHOPPING_STORAGE_KEY), duplicateWeek);
  const duplicateItems = { ...snapshot, items: [snapshot.items[0], { ...snapshot.items[0] }] }; const duplicateItemSave = JSON.stringify({ version: SHOPPING_SAVE_VERSION, snapshots: [duplicateItems] }); storage.setItem(SHOPPING_STORAGE_KEY, duplicateItemSave);
  loaded = loadShoppingSnapshots(storage); assert.equal(loaded.allowWrite, false); assert.equal(saveShoppingSnapshots(storage, [snapshot], loaded).ok, false); assert.equal(storage.getItem(SHOPPING_STORAGE_KEY), duplicateItemSave);
  assert.throws(() => validateShoppingSnapshot(duplicateItems), ShoppingError);
  assert.throws(() => validateShoppingSnapshot({ ...snapshot, version: SHOPPING_SNAPSHOT_VERSION + 1 }), ShoppingError);
});

test("CSV export has stable columns and escapes commas, quotes, and newlines", () => {
  const snapshot = validateShoppingSnapshot({ version: SHOPPING_SNAPSHOT_VERSION, weekStart: "2026-10-05", generatedAt: "2026-10-05T16:30:00.000Z", generatedToday: "2026-10-05", dependencies: "test", items: [{ name: "Fine salt", normalizedName: "fine salt", dimension: "mass", quantity: 0.0001, unit: "g", purchased: true }] });
  assert.equal(snapshotToCsv(snapshot), "Ingredient,Quantity,Unit,Purchased\r\nFine salt,0.0001,g,Yes\r\n");
  assert.equal(escapeCsvCell("Salt, \"fine\"\nsea"), "\"Salt, \"\"fine\"\"\nsea\"");
});

test("the page registers the shopping view, export controls, responsive layout, and browser route", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const index = fs.readFileSync(path.join(root, "public/index.html"), "utf8"); const app = fs.readFileSync(path.join(root, "public/app.mjs"), "utf8"); const style = fs.readFileSync(path.join(root, "public/style.css"), "utf8");
  for (const id of ["shopping-view", "shopping-week-start", "generate-shopping", "export-shopping", "shopping-items", "regenerate-dialog"]) assert.match(index, new RegExp(`id=\\"${id}\\"`));
  for (const behavior of ["createShoppingSnapshot", "snapshotIsStale", "snapshotToCsv", "saveShoppingSnapshots", "loadShoppingSnapshots"]) assert.equal(app.includes(behavior), true);
  for (const behavior of ["refreshExpiryDependentDisplays", "localDateChanged", "window.addEventListener(\"focus\"", "document.addEventListener(\"visibilitychange\""]) assert.equal(app.includes(behavior), true);
  assert.match(style, /\.shopping-item \{ display:flex;/); assert.match(style, /@media \(max-width:500px\).*?\.shopping-panel \.inventory-header \{ flex-direction:column; align-items:stretch; \}/); assert.equal(ASSETS.get("/src/shopping.mjs"), "../src/shopping.mjs");
});
