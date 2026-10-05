import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { MenuError, addMenuEntry, aggregateMenuDemand, entriesForWeek, menuEntriesForRecipe, menuEntryKey, removeMenuEntry, updateMenuEntry, validateMenuEntry, validateWeekStart, weekDates, weekStartForDate } from "../src/menu.mjs";
import { validateRecipe } from "../src/recipes.mjs";
import { MENU_SAVE_VERSION, MENU_STORAGE_KEY, loadMenu, saveMenu } from "../src/storage.mjs";
import { ASSETS } from "../src/server.mjs";

const pastaInput = {
  name: "Tomato pasta", baseServings: 2, cookingMinutes: 20, steps: "Cook and serve.",
  ingredients: [{ name: "Pasta", quantity: 200, unit: "g" }, { name: "Tomatoes", quantity: 300, unit: "g" }, { name: "Olive oil", quantity: 20, unit: "ml" }],
};
const soupInput = {
  name: "Tomato soup", baseServings: 2, cookingMinutes: 15, steps: "Heat and serve.",
  ingredients: [{ name: "Tomatoes", quantity: 0.1, unit: "kg" }, { name: "Olive oil", quantity: 0.2, unit: "L" }],
};
const pasta = validateRecipe(pastaInput, { id: "pasta", now: new Date("2026-10-02T12:00:00Z") });
const soup = validateRecipe(soupInput, { id: "soup", now: new Date("2026-10-02T12:00:00Z") });
const mondayDinner = { weekStart: "2026-10-05", date: "2026-10-05", slot: "dinner", recipeId: "pasta", servings: 4 };
const wednesdayLunch = { weekStart: "2026-10-05", date: "2026-10-07", slot: "lunch", recipeId: "pasta", servings: 2 };

class MemoryStorage { constructor() { this.values = new Map(); } getItem(key) { return this.values.get(key) || null; } setItem(key, value) { this.values.set(key, value); } }

test("weeks are real Monday-based dates and show all seven dates", () => {
  assert.equal(weekStartForDate("2026-10-05"), "2026-10-05");
  assert.equal(weekStartForDate("2026-10-11"), "2026-10-05");
  assert.deepEqual(weekDates("2026-10-05"), ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"]);
  for (const invalid of ["2026-10-06", "2026-02-30", ""]) assert.throws(() => validateWeekStart(invalid), MenuError);
});

test("menu entries require a saved recipe, a week date, a valid slot, and positive whole servings", () => {
  assert.deepEqual(validateMenuEntry(mondayDinner), mondayDinner);
  assert.deepEqual(Object.keys(validateMenuEntry(mondayDinner)).sort(), ["date", "recipeId", "servings", "slot", "weekStart"]);
  for (const invalid of [{ ...mondayDinner, date: "2026-10-12" }, { ...mondayDinner, slot: "brunch" }, { ...mondayDinner, recipeId: " " }, { ...mondayDinner, servings: 0 }, { ...mondayDinner, servings: 1.5 }]) assert.throws(() => validateMenuEntry(invalid), MenuError);
});

test("a date and meal slot accepts one entry, supports replacement, removal, and independent weeks", () => {
  const entries = addMenuEntry([mondayDinner], wednesdayLunch);
  assert.throws(() => addMenuEntry(entries, { ...mondayDinner, recipeId: "soup" }), MenuError);
  const edited = updateMenuEntry(entries, menuEntryKey(mondayDinner), { ...mondayDinner, recipeId: "soup", servings: 3 });
  assert.deepEqual(edited[0], { ...mondayDinner, recipeId: "soup", servings: 3 });
  const nextWeek = addMenuEntry(edited, { ...mondayDinner, weekStart: "2026-10-12", date: "2026-10-12", slot: "breakfast" });
  assert.equal(entriesForWeek(nextWeek, "2026-10-05").length, 2);
  assert.equal(entriesForWeek(nextWeek, "2026-10-12").length, 1);
  assert.equal(removeMenuEntry(nextWeek, menuEntryKey(wednesdayLunch)).length, 2);
});

test("weekly demand uses live recipe IDs, scales and aggregates matching names and dimensions", () => {
  const entries = [mondayDinner, wednesdayLunch];
  const demand = aggregateMenuDemand(entries, [pasta, soup]);
  assert.deepEqual(demand.ingredients.map((item) => [item.name, item.quantity, item.unit]), [["Olive oil", 60, "ml"], ["Pasta", 600, "g"], ["Tomatoes", 900, "g"]]);
  assert.deepEqual(menuEntriesForRecipe(entries, "pasta"), entries);
  const revised = validateRecipe({ ...pastaInput, name: "Garden pasta", ingredients: [{ name: "Pasta", quantity: 0.1, unit: "kg" }, { name: "Tomatoes", quantity: 150, unit: "g" }, { name: "Olive oil", quantity: 10, unit: "ml" }] }, { id: "pasta", now: new Date("2026-10-03T12:00:00Z") });
  const liveDemand = aggregateMenuDemand(entries, [revised, soup]);
  assert.deepEqual(liveDemand.ingredients.map((item) => [item.name, item.quantity, item.unit]), [["Olive oil", 30, "ml"], ["Pasta", 300, "g"], ["Tomatoes", 450, "g"]]);
  assert.deepEqual(aggregateMenuDemand([{ ...mondayDinner, recipeId: "missing" }], [pasta]).missingRecipeIds, ["missing"]);
});

test("menu persistence recovers valid data and protects malformed or unsupported saves", () => {
  const storage = new MemoryStorage(); const entries = [mondayDinner, wednesdayLunch];
  assert.equal(saveMenu(storage, entries).ok, true); assert.deepEqual(loadMenu(storage).items, entries);
  storage.setItem(MENU_STORAGE_KEY, "{"); assert.equal(loadMenu(storage).allowWrite, false);
  const future = JSON.stringify({ version: MENU_SAVE_VERSION + 1, entries: [{ future: true }] }); storage.setItem(MENU_STORAGE_KEY, future);
  const loaded = loadMenu(storage); assert.equal(loaded.allowWrite, false); assert.equal(saveMenu(storage, entries, loaded).ok, false); assert.equal(storage.getItem(MENU_STORAGE_KEY), future);
});

test("menu persistence rejects duplicate date-and-slot entries without replacing saved data", () => {
  const storage = new MemoryStorage();
  const duplicateSave = JSON.stringify({ version: MENU_SAVE_VERSION, entries: [mondayDinner, { ...mondayDinner }] });
  storage.setItem(MENU_STORAGE_KEY, duplicateSave);
  const loaded = loadMenu(storage);
  assert.deepEqual(loaded.items, []);
  assert.equal(loaded.allowWrite, false);
  assert.equal(loaded.notice, "Saved weekly menu is invalid. Your current changes will remain on this page only.");
  assert.equal(saveMenu(storage, [wednesdayLunch], loaded).ok, false);
  assert.equal(storage.getItem(MENU_STORAGE_KEY), duplicateSave);
});

test("the combined page retains inventory and recipes while registering weekly-menu routes", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const index = fs.readFileSync(path.join(root, "public/index.html"), "utf8"); const app = fs.readFileSync(path.join(root, "public/app.mjs"), "utf8");
  for (const entrypoint of ["inventory-view", "recipes-view", "recipe-form", "menu-view", "week-start", "week-grid", "menu-form", "weekly-demand"]) assert.match(index, new RegExp(`id=\\"${entrypoint}\\"`));
  for (const behavior of ["renderMenu()", "menuEntriesForRecipe(menuEntries, item.id)", "Remove its planned menu entries first", "saveMenu", "updateMenuEntry"]) assert.equal(app.includes(behavior), true);
  assert.equal(ASSETS.get("/src/menu.mjs"), "../src/menu.mjs");
});

test("the weekly board can shrink and stacks day cards with usable controls on phones", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const style = fs.readFileSync(path.join(root, "public/style.css"), "utf8");
  const phoneStyles = style.match(/@media \(max-width:500px\) \{(.+)\}\n@media \(max-width:380px\)/)?.[1] || "";
  assert.match(style, /\.menu-panel\s*\{\s*min-width:0;\s*\}/);
  assert.match(style, /\.section-nav\s*\{[^}]*flex-wrap:wrap;/);
  assert.match(phoneStyles, /\.menu-controls \{ grid-template-columns:1fr; \}/);
  assert.match(phoneStyles, /\.week-grid \{ grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,10\.5rem\),1fr\)\); overflow-x:visible; \}/);
  assert.match(phoneStyles, /\.day-card \{ min-width:0; \}/);
  assert.match(style, /\.week-grid \{ display:grid; grid-template-columns:repeat\(7,minmax\(10\.5rem,1fr\)\);/);
});
