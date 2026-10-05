import assert from "node:assert/strict";
import test from "node:test";
import { InventoryError, filterIngredients, isExpired, normalizeName, updateIngredient, validateIngredient } from "../src/inventory.mjs";
import { SAVE_VERSION, STORAGE_KEY, accessBrowserStorage, loadInventory, saveInventory } from "../src/storage.mjs";

const value = { name: "  Red   Lentils ", quantity: "1.25", unit: "kg", storage: "Pantry", expiryDate: "2026-10-02" };
const make = (input = value, id = "a") => validateIngredient(input, { id, now: new Date("2026-10-01T12:00:00Z") });
class MemoryStorage { constructor() { this.values = new Map(); } getItem(key) { return this.values.get(key) || null; } setItem(key, value) { this.values.set(key, value); } }

test("ingredient validation normalizes names and accepts zero quantities", () => {
  const item = make({ ...value, quantity: 0 });
  assert.equal(item.name, "Red Lentils"); assert.equal(item.normalizedName, "red lentils"); assert.equal(item.quantity, 0);
  assert.equal(normalizeName("  A   B "), "A B");
});
test("invalid ingredient inputs have clear rejections", () => {
  for (const input of [{ ...value, name: "  " }, { ...value, quantity: "" }, { ...value, quantity: "-1" }, { ...value, quantity: "not a number" }, { ...value, unit: "oz" }, { ...value, storage: "Cupboard" }, { ...value, expiryDate: "2026-02-30" }]) assert.throws(() => make(input), InventoryError);
});
test("today is usable and earlier dates are expired", () => {
  assert.equal(isExpired("2026-10-01", "2026-10-02"), true);
  assert.equal(isExpired("2026-10-02", "2026-10-02"), false);
  assert.equal(isExpired(null, "2026-10-02"), false);
});
test("search combines with storage and expiry filters", () => {
  const items = [make(value, "lentils"), make({ ...value, name: "Lentil soup", storage: "Refrigerator", expiryDate: "2026-10-01" }, "soup"), make({ ...value, name: "Flour", expiryDate: "" }, "flour")];
  assert.deepEqual(filterIngredients(items, { search: "lentil", storage: "Refrigerator", expiry: "expired" }, "2026-10-02").map((item) => item.id), ["soup"]);
  assert.deepEqual(filterIngredients(items, { storage: "Pantry", expiry: "usable" }, "2026-10-02").map((item) => item.id), ["flour", "lentils"]);
  assert.deepEqual(filterIngredients(items, { expiry: "no-expiry" }, "2026-10-02").map((item) => item.id), ["flour"]);
});
test("editing retains identity and original creation time", () => {
  const original = make(value, "lentils");
  const edited = updateIngredient([original], "lentils", { ...value, name: "Green lentils", quantity: 2 }, { now: new Date("2026-10-02T12:00:00Z") })[0];
  assert.equal(edited.id, "lentils"); assert.equal(edited.createdAt, original.createdAt); assert.equal(edited.name, "Green lentils");
});
test("inventory survives reload and keeps damaged saved data from replacement", () => {
  const storage = new MemoryStorage(), item = make();
  assert.equal(saveInventory(storage, [item]).ok, true);
  assert.deepEqual(loadInventory(storage).items, [item]);
  storage.setItem(STORAGE_KEY, "{");
  const malformed = loadInventory(storage);
  assert.match(malformed.notice, /could not be read/); assert.equal(malformed.allowWrite, false);
  const futureSave = JSON.stringify({ version: SAVE_VERSION + 1, items: [{ future: true }] });
  storage.setItem(STORAGE_KEY, futureSave);
  const unsupported = loadInventory(storage);
  assert.match(unsupported.notice, /unsupported/); assert.equal(unsupported.allowWrite, false);
  const result = saveInventory(storage, [item], { allowWrite: unsupported.allowWrite, notice: unsupported.notice });
  assert.equal(result.ok, false); assert.equal(storage.getItem(STORAGE_KEY), futureSave);
});
test("a throwing localStorage getter leaves the page usable in memory", () => {
  const storage = accessBrowserStorage({ get localStorage() { throw new Error("blocked"); } });
  const loaded = loadInventory(storage);
  assert.match(loaded.notice, /could not be read/); assert.equal(loaded.allowWrite, false);
  const result = saveInventory(storage, [make()], { allowWrite: loaded.allowWrite, notice: loaded.notice });
  assert.equal(result.ok, false); assert.match(result.notice, /remain on this page only/);
});
test("blocked local storage reports save failures", () => {
  const storage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.match(loadInventory(storage).notice, /could not be read/);
  const result = saveInventory(storage, [make()]); assert.equal(result.ok, false); assert.match(result.notice, /could not be saved/);
});
