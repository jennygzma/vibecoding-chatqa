import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { RecipeError, aggregateIngredients, assessRecipeAvailability, filterRecipes, formatQuantity, scaleRecipe, updateRecipe, validateRecipe } from "../src/recipes.mjs";
import { RECIPE_SAVE_VERSION, RECIPE_STORAGE_KEY, loadRecipes, saveRecipes } from "../src/storage.mjs";
import { ASSETS } from "../src/server.mjs";

const pasta = {
  name: " Tomato  pasta ", baseServings: "2", cookingMinutes: "20", steps: "Boil pasta.\nToss and serve.",
  ingredients: [
    { name: "Pasta", quantity: "200", unit: "g" }, { name: " tomatoes ", quantity: "300", unit: "g" },
    { name: "Olive oil", quantity: "20", unit: "ml" }, { name: "Pasta", quantity: "0.05", unit: "kg" },
  ],
};
class MemoryStorage { constructor() { this.values = new Map(); } getItem(key) { return this.values.get(key) || null; } setItem(key, value) { this.values.set(key, value); } }

test("recipe validation normalizes names and requires all recipe fields", () => {
  const recipe = validateRecipe(pasta, { id: "pasta", now: new Date("2026-10-02T12:00:00Z") });
  assert.equal(recipe.name, "Tomato pasta"); assert.equal(recipe.ingredients[1].normalizedName, "tomatoes"); assert.deepEqual(recipe.steps, ["Boil pasta.", "Toss and serve."]);
  for (const input of [{ ...pasta, name: "" }, { ...pasta, baseServings: "1.5" }, { ...pasta, cookingMinutes: "-1" }, { ...pasta, steps: "" }, { ...pasta, ingredients: [] }, { ...pasta, ingredients: [{ name: "Pasta", quantity: 0, unit: "g" }] }]) assert.throws(() => validateRecipe(input), RecipeError);
});
test("editing keeps recipe identity and original creation time", () => {
  const original = validateRecipe(pasta, { id: "pasta", now: new Date("2026-10-01T12:00:00Z") });
  const updated = updateRecipe([original], "pasta", { ...pasta, name: "Summer pasta" }, { now: new Date("2026-10-02T12:00:00Z") })[0];
  assert.equal(updated.id, "pasta"); assert.equal(updated.createdAt, original.createdAt); assert.equal(updated.name, "Summer pasta");
});
test("search is case-insensitive and recipe ingredient totals convert only within a dimension", () => {
  const recipe = validateRecipe(pasta, { id: "pasta" });
  assert.deepEqual(filterRecipes([recipe], "TOMATO").map((item) => item.id), ["pasta"]);
  assert.deepEqual(aggregateIngredients(recipe.ingredients).map((item) => [item.name, item.quantity, item.unit]), [["Olive oil", 20, "ml"], ["Pasta", 250, "g"], ["tomatoes", 300, "g"]]);
  assert.deepEqual(scaleRecipe(recipe, 4).ingredients.map((item) => [item.name, item.quantity, item.unit]), [["Olive oil", 40, "ml"], ["Pasta", 500, "g"], ["tomatoes", 600, "g"]]);
});
test("availability totals usable matching stock and leaves expired and wrong-dimension stock out", () => {
  const recipe = validateRecipe({ ...pasta, ingredients: pasta.ingredients.slice(0, 3) }, { id: "pasta" });
  const inventory = [
    { name: "Pasta", normalizedName: "pasta", quantity: .25, unit: "kg", expiryDate: null },
    { name: "Tomatoes", normalizedName: "tomatoes", quantity: 150, unit: "g", expiryDate: "2026-10-03" },
    { name: "Tomatoes", normalizedName: "tomatoes", quantity: 1000, unit: "ml", expiryDate: null },
    { name: "Tomatoes", normalizedName: "tomatoes", quantity: 500, unit: "g", expiryDate: "2026-10-01" },
    { name: "Olive oil", normalizedName: "olive oil", quantity: 100, unit: "ml", expiryDate: null },
  ];
  const check = assessRecipeAvailability(recipe, 2, inventory, "2026-10-02");
  assert.equal(check.enough, false);
  assert.deepEqual(check.ingredients.map((item) => [item.name, item.available, item.shortfall]), [["Olive oil", 100, 0], ["Pasta", 250, 0], ["tomatoes", 150, 150]]);
  assert.equal(inventory[0].quantity, .25);
});
test("availability treats fractional equality as enough without hiding real small shortages", () => {
  const recipe = validateRecipe({ name: "Salt check", baseServings: 1, cookingMinutes: 0, steps: "Mix.", ingredients: [{ name: "Salt", quantity: .1, unit: "g" }, { name: "Salt", quantity: .2, unit: "g" }] }, { id: "salt" });
  const enough = assessRecipeAvailability(recipe, 1, [{ name: "Salt", normalizedName: "salt", quantity: .3, unit: "g", expiryDate: null }], "2026-10-02");
  assert.equal(enough.enough, true); assert.equal(enough.ingredients[0].shortfall, 0);
  const short = assessRecipeAvailability(recipe, 1, [{ name: "Salt", normalizedName: "salt", quantity: .299999, unit: "g", expiryDate: null }], "2026-10-02");
  assert.equal(short.enough, false); assert.equal(short.ingredients[0].shortfall > 0, true);
});
test("availability never treats zero stock as enough for a positive tiny requirement and displays small quantities", () => {
  const recipe = validateRecipe({ name: "Tiny salt check", baseServings: 1, cookingMinutes: 0, steps: "Mix.", ingredients: [{ name: "Salt", quantity: 1e-16, unit: "g" }] }, { id: "tiny-salt" });
  const check = assessRecipeAvailability(recipe, 1, [], "2026-10-02");
  assert.equal(check.enough, false); assert.equal(check.ingredients[0].enough, false); assert.equal(check.ingredients[0].shortfall, 1e-16);
  assert.equal(formatQuantity(0.0001), "0.0001");
});
test("the single page retains inventory and recipe entrypoints", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const index = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/app.mjs"), "utf8");
  for (const entrypoint of ["inventory-view", "inventory-form", "inventory-search", "inventory-storage-filter", "inventory-expiry-filter", "delete-dialog", "recipes-view", "recipe-form"]) assert.match(index, new RegExp(`id=\\"${entrypoint}\\"`));
  for (const behavior of ["saveInventory", "updateIngredient", "filterIngredients", "renderRecipes()", "assessRecipeAvailability(recipe, servings.value, inventory)"]) assert.equal(app.includes(behavior), true);
});
test("the port-4184 server registers every browser recipe module", () => {
  assert.equal(ASSETS.get("/app.mjs"), "app.mjs");
  assert.equal(ASSETS.get("/src/recipes.mjs"), "../src/recipes.mjs");
  assert.equal(ASSETS.get("/src/inventory.mjs"), "../src/inventory.mjs");
  assert.equal(ASSETS.get("/src/storage.mjs"), "../src/storage.mjs");
});
test("recipe persistence recovers valid saves and protects malformed or future recipe data", () => {
  const storage = new MemoryStorage(); const recipe = validateRecipe(pasta, { id: "pasta" });
  assert.equal(saveRecipes(storage, [recipe]).ok, true); assert.deepEqual(loadRecipes(storage).items, [recipe]);
  storage.setItem(RECIPE_STORAGE_KEY, "{"); assert.equal(loadRecipes(storage).allowWrite, false);
  const future = JSON.stringify({ version: RECIPE_SAVE_VERSION + 1, recipes: [{ future: true }] }); storage.setItem(RECIPE_STORAGE_KEY, future);
  const loaded = loadRecipes(storage); assert.equal(loaded.allowWrite, false); assert.equal(saveRecipes(storage, [recipe], loaded).ok, false); assert.equal(storage.getItem(RECIPE_STORAGE_KEY), future);
});
