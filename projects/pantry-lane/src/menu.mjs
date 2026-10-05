import { isCalendarDate, normalizeName } from "./inventory.mjs";
import { aggregateIngredients, scaleRecipe } from "./recipes.mjs";

export const MEAL_SLOTS = ["breakfast", "lunch", "dinner"];
export const SLOT_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };

export class MenuError extends Error {}

function positiveInteger(value, message) {
  if (typeof value === "string" && !value.trim()) throw new MenuError(message);
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new MenuError(message);
  return number;
}

function utcDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function weekStartForDate(value) {
  if (!isCalendarDate(value)) throw new MenuError("Choose a real calendar date.");
  const date = utcDate(value);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return isoDate(date);
}

export function validateWeekStart(value) {
  if (!isCalendarDate(value)) throw new MenuError("Choose a real Monday start date.");
  if (utcDate(value).getUTCDay() !== 1) throw new MenuError("Choose a Monday as the week start.");
  return value;
}

export function weekDates(weekStart) {
  const start = validateWeekStart(weekStart);
  return Array.from({ length: 7 }, (_, index) => {
    const date = utcDate(start);
    date.setUTCDate(date.getUTCDate() + index);
    return isoDate(date);
  });
}

export function menuEntryKey(entry) {
  return `${entry.weekStart}\u0000${entry.date}\u0000${entry.slot}`;
}

export function validateMenuEntry(input) {
  const weekStart = validateWeekStart(input?.weekStart);
  const date = input?.date;
  if (!isCalendarDate(date) || !weekDates(weekStart).includes(date)) throw new MenuError("Choose a date inside the selected Monday-based week.");
  if (!MEAL_SLOTS.includes(input?.slot)) throw new MenuError("Choose breakfast, lunch, or dinner.");
  const recipeId = typeof input?.recipeId === "string" ? input.recipeId.trim() : "";
  if (!recipeId) throw new MenuError("Choose a saved recipe.");
  return { weekStart, date, slot: input.slot, recipeId, servings: positiveInteger(input?.servings, "Servings must be a positive whole number.") };
}

export function addMenuEntry(entries, input) {
  const entry = validateMenuEntry(input);
  if (entries.some((item) => menuEntryKey(item) === menuEntryKey(entry))) throw new MenuError("That date and meal slot already has a planned meal. Edit it to replace the recipe or servings.");
  return [...entries, entry];
}

export function updateMenuEntry(entries, originalKey, input) {
  const index = entries.findIndex((item) => menuEntryKey(item) === originalKey);
  if (index < 0) throw new MenuError("That planned meal is no longer available.");
  const entry = validateMenuEntry(input);
  if (entries.some((item, itemIndex) => itemIndex !== index && menuEntryKey(item) === menuEntryKey(entry))) throw new MenuError("That date and meal slot already has a planned meal. Edit that meal instead.");
  return entries.map((item, itemIndex) => itemIndex === index ? entry : item);
}

export function removeMenuEntry(entries, key) {
  if (!entries.some((item) => menuEntryKey(item) === key)) throw new MenuError("That planned meal is no longer available.");
  return entries.filter((item) => menuEntryKey(item) !== key);
}

export function entriesForWeek(entries, weekStart) {
  const start = validateWeekStart(weekStart);
  return entries.filter((entry) => entry.weekStart === start).toSorted((a, b) => a.date.localeCompare(b.date) || MEAL_SLOTS.indexOf(a.slot) - MEAL_SLOTS.indexOf(b.slot));
}

export function menuEntriesForRecipe(entries, recipeId) {
  return entries.filter((entry) => entry.recipeId === recipeId);
}

export function aggregateMenuDemand(entries, recipes) {
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const ingredients = [];
  const missingRecipeIds = [];
  for (const entry of entries) {
    const recipe = recipesById.get(entry.recipeId);
    if (!recipe) { missingRecipeIds.push(entry.recipeId); continue; }
    ingredients.push(...scaleRecipe(recipe, entry.servings).ingredients);
  }
  return { ingredients: aggregateIngredients(ingredients), missingRecipeIds: [...new Set(missingRecipeIds)] };
}

export function formatMenuDate(value) {
  if (!isCalendarDate(value)) return "Invalid date";
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(utcDate(value));
}

export function recipeName(recipe) {
  return normalizeName(recipe?.name) || "Unavailable recipe";
}
