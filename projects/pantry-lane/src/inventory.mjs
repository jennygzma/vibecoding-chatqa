export const UNITS = ["g", "kg", "ml", "L", "pcs"];
export const STORAGE_LOCATIONS = ["Pantry", "Refrigerator", "Freezer", "Counter"];

export class InventoryError extends Error {}

export function localDate(now = new Date()) {
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function localDateChanged(previousDate, now = new Date()) {
  return previousDate !== localDate(now);
}

export function normalizeName(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function isCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isExpired(expiryDate, today = localDate()) {
  return Boolean(expiryDate) && expiryDate < today;
}

function quantity(value) {
  if (typeof value === "string" && !value.trim()) throw new InventoryError("Enter a quantity of zero or more.");
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < 0) throw new InventoryError("Quantity must be zero or more.");
  return number;
}

export function validateIngredient(input, { id = crypto.randomUUID(), now = new Date() } = {}) {
  const name = normalizeName(input?.name);
  if (!name || name.length > 80) throw new InventoryError("Enter an ingredient name of up to 80 characters.");
  if (!UNITS.includes(input?.unit)) throw new InventoryError("Choose a valid unit.");
  if (!STORAGE_LOCATIONS.includes(input?.storage)) throw new InventoryError("Choose a storage location.");
  const expiryDate = input?.expiryDate || null;
  if (expiryDate && !isCalendarDate(expiryDate)) throw new InventoryError("Enter a valid expiry date.");
  return {
    id,
    name,
    normalizedName: name.toLocaleLowerCase("en-US"),
    quantity: quantity(input?.quantity),
    unit: input.unit,
    storage: input.storage,
    expiryDate,
    createdAt: input?.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function updateIngredient(items, id, input, options) {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) throw new InventoryError("That ingredient is no longer available.");
  const item = validateIngredient({ ...input, createdAt: items[index].createdAt }, { id, ...options });
  return items.map((current, currentIndex) => currentIndex === index ? item : current);
}

export function filterIngredients(items, filters = {}, today = localDate()) {
  const search = normalizeName(filters.search || "").toLocaleLowerCase("en-US");
  return items.filter((item) => {
    const nameMatches = !search || item.normalizedName.includes(search);
    const storageMatches = !filters.storage || filters.storage === "all" || item.storage === filters.storage;
    const expiry = filters.expiry || "all";
    const expiryMatches = expiry === "all"
      || (expiry === "expired" && isExpired(item.expiryDate, today))
      || (expiry === "usable" && !isExpired(item.expiryDate, today))
      || (expiry === "no-expiry" && !item.expiryDate);
    return nameMatches && storageMatches && expiryMatches;
  }).toSorted((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.createdAt.localeCompare(b.createdAt));
}
