import { UNITS, isExpired, localDate, normalizeName } from "./inventory.mjs";

export class RecipeError extends Error {}

const dimensions = { g: "mass", kg: "mass", ml: "volume", L: "volume", pcs: "pieces" };
const baseUnits = { mass: "g", volume: "ml", pieces: "pcs" };
const multipliers = { g: 1, kg: 1000, ml: 1, L: 1000, pcs: 1 };

function positiveNumber(value, message) {
  if (typeof value === "string" && !value.trim()) throw new RecipeError(message);
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new RecipeError(message);
  return number;
}

function positiveInteger(value, message) {
  const number = positiveNumber(value, message);
  if (!Number.isInteger(number)) throw new RecipeError(message);
  return number;
}

function nonnegativeInteger(value, message) {
  if (typeof value === "string" && !value.trim()) throw new RecipeError(message);
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < 0) throw new RecipeError(message);
  return number;
}

export function unitDimension(unit) {
  return dimensions[unit] || null;
}

export function toBaseQuantity(quantity, unit) {
  const dimension = unitDimension(unit);
  if (!dimension || !Number.isFinite(quantity)) throw new RecipeError("Choose a valid ingredient unit and quantity.");
  return quantity * multipliers[unit];
}

export function formatQuantity(quantity) {
  return Number.isInteger(quantity) ? String(quantity) : Number(quantity.toPrecision(12)).toString();
}

export function quantityIsCovered(required, available) {
  const difference = required - available;
  const tolerance = Number.EPSILON * 32 * Math.max(Math.abs(required), Math.abs(available));
  return available > 0 && difference <= tolerance;
}

export function validateRecipe(input, { id = crypto.randomUUID(), now = new Date() } = {}) {
  const name = normalizeName(input?.name);
  if (!name || name.length > 80) throw new RecipeError("Enter a recipe name of up to 80 characters.");
  const rawIngredients = Array.isArray(input?.ingredients) ? input.ingredients : [];
  if (!rawIngredients.length) throw new RecipeError("Add at least one ingredient.");
  const ingredients = rawIngredients.map((ingredient) => {
    const ingredientName = normalizeName(ingredient?.name);
    if (!ingredientName || ingredientName.length > 80) throw new RecipeError("Every ingredient needs a name of up to 80 characters.");
    if (!UNITS.includes(ingredient?.unit)) throw new RecipeError("Choose a valid ingredient unit.");
    return {
      name: ingredientName,
      normalizedName: ingredientName.toLocaleLowerCase("en-US"),
      quantity: positiveNumber(ingredient?.quantity, "Ingredient quantities must be greater than zero."),
      unit: ingredient.unit,
    };
  });
  const sourceSteps = Array.isArray(input?.steps) ? input.steps : String(input?.steps || "").split("\n");
  const steps = sourceSteps.map((step) => normalizeName(step)).filter(Boolean);
  if (!steps.length) throw new RecipeError("Add at least one written step.");
  if (steps.some((step) => step.length > 500)) throw new RecipeError("Keep each written step to 500 characters or fewer.");
  return {
    id,
    name,
    normalizedName: name.toLocaleLowerCase("en-US"),
    baseServings: positiveInteger(input?.baseServings, "Base servings must be a positive whole number."),
    ingredients,
    steps,
    cookingMinutes: nonnegativeInteger(input?.cookingMinutes, "Cooking minutes must be a whole number of zero or more."),
    createdAt: input?.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function updateRecipe(recipes, id, input, options) {
  const current = recipes.find((recipe) => recipe.id === id);
  if (!current) throw new RecipeError("That recipe is no longer available.");
  const recipe = validateRecipe({ ...input, createdAt: current.createdAt }, { id, ...options });
  return recipes.map((item) => item.id === id ? recipe : item);
}

export function filterRecipes(recipes, search = "") {
  const term = normalizeName(search).toLocaleLowerCase("en-US");
  return recipes.filter((recipe) => !term || recipe.normalizedName.includes(term))
    .toSorted((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.createdAt.localeCompare(b.createdAt));
}

export function aggregateIngredients(ingredients, servingsFactor = 1) {
  const totals = new Map();
  for (const ingredient of ingredients) {
    const dimension = unitDimension(ingredient.unit);
    const key = `${ingredient.normalizedName}\u0000${dimension}`;
    const current = totals.get(key) || { name: ingredient.name, normalizedName: ingredient.normalizedName, dimension, unit: baseUnits[dimension], quantity: 0 };
    current.quantity += toBaseQuantity(ingredient.quantity, ingredient.unit) * servingsFactor;
    totals.set(key, current);
  }
  return [...totals.values()].toSorted((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.dimension.localeCompare(b.dimension));
}

export function scaleRecipe(recipe, servings) {
  const requestedServings = positiveInteger(servings, "Choose a positive whole number of servings.");
  return { servings: requestedServings, ingredients: aggregateIngredients(recipe.ingredients, requestedServings / recipe.baseServings) };
}

export function assessRecipeAvailability(recipe, servings, inventory, today = localDate()) {
  const scaled = scaleRecipe(recipe, servings);
  const available = new Map();
  for (const item of inventory) {
    if (isExpired(item.expiryDate, today)) continue;
    const dimension = unitDimension(item.unit);
    if (!dimension) continue;
    const key = `${item.normalizedName}\u0000${dimension}`;
    available.set(key, (available.get(key) || 0) + toBaseQuantity(item.quantity, item.unit));
  }
  const ingredients = scaled.ingredients.map((ingredient) => {
    const stock = available.get(`${ingredient.normalizedName}\u0000${ingredient.dimension}`) || 0;
    const difference = ingredient.quantity - stock;
    const enough = quantityIsCovered(ingredient.quantity, stock);
    return { ...ingredient, available: stock, shortfall: enough ? 0 : difference, enough };
  });
  return { servings: scaled.servings, ingredients, enough: ingredients.every((ingredient) => ingredient.enough) };
}
