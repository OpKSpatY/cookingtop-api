import { Prisma } from '../../generated/prisma/client';

/**
 * `true` se, para cada linha de `recipe_ingredients`, a soma na despensa
 * (`totalsByIngredient`) for >= quantidade exigida (mesma regra de pantry-comparison).
 * Receita sem ingredientes → `true`.
 */
export function canMakeRecipeWithPantryTotals(
  recipeIngredients: Array<{ amount: unknown; ingredientId: string }>,
  totalsByIngredient: Map<string, number>,
): boolean {
  if (recipeIngredients.length === 0) {
    return true;
  }
  for (const ri of recipeIngredients) {
    const required = new Prisma.Decimal(String(ri.amount));
    const total = totalsByIngredient.get(ri.ingredientId);
    const haveDec =
      total !== undefined && Number.isFinite(total)
        ? new Prisma.Decimal(total)
        : null;
    if (haveDec === null || !haveDec.gte(required)) {
      return false;
    }
  }
  return true;
}

/**
 * Interpreta `user_ingredients.quantity` (string) como número para comparar com o Decimal da receita.
 */
export function parseUserQuantityString(raw: string): {
  value: number | null;
  parseError: boolean;
} {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { value: null, parseError: true };
  }
  const normalized = trimmed.replace(/\s/g, '').replace(',', '.');
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n)) {
    return { value: null, parseError: true };
  }
  return { value: n, parseError: false };
}
