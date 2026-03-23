/**
 * Formata a relação do Prisma (`ingredients`) para a resposta da API (`ingredient`),
 * com aliases aceitos pelo app (nome, image_url).
 */
type PrismaIngredientRow = {
  id: string;
  name: string;
  imageUrl: string | null;
  measureUnits?: {
    id: string;
    name: string;
    abbreviation: string;
  } | null;
  ingredientUnits?: Array<{
    measureUnitsId: string;
    measureUnits: {
      id: string;
      name: string;
      abbreviation: string;
    };
  }>;
};

export type UserIngredientApiResponse = {
  id: string;
  ingredientId: string;
  quantity: string;
  createdAt: Date;
  ingredient: {
    id: string;
    name: string;
    nome: string;
    imageUrl: string | null;
    image_url: string | null;
    /** Unidade padrão do ingrediente (`ingredients.measure_units_id`) */
    measureUnit?: {
      id: string;
      name: string;
      abbreviation: string;
    };
    /**
     * Unidades cadastradas em `ingredient_units` para este ingrediente
     * (measure_units_id + nome e abreviação de `measure_units`).
     * Array vazio se não houver linha em `ingredient_units`.
     */
    ingredientUnitMeasureUnits: Array<{
      measureUnitsId: string;
      measure_units_id: string;
      name: string;
      abbreviation: string;
    }>;
  } | null;
};

export function mapUserIngredientToResponse(row: {
  id: string;
  ingredientId: string;
  quantity: string;
  createdAt: Date;
  ingredients: PrismaIngredientRow | null;
}): UserIngredientApiResponse {
  const ing = row.ingredients;

  if (!ing) {
    return {
      id: row.id,
      ingredientId: row.ingredientId,
      quantity: row.quantity,
      createdAt: row.createdAt,
      ingredient: null,
    };
  }

  const fromIngredientUnits = ing.ingredientUnits ?? [];
  const ingredientUnitMeasureUnits = fromIngredientUnits.map((iu) => ({
    measureUnitsId: iu.measureUnitsId,
    measure_units_id: iu.measureUnitsId,
    name: iu.measureUnits.name,
    abbreviation: iu.measureUnits.abbreviation,
  }));

  const ingredient: NonNullable<UserIngredientApiResponse['ingredient']> = {
    id: ing.id,
    name: ing.name,
    nome: ing.name,
    imageUrl: ing.imageUrl,
    image_url: ing.imageUrl,
    ingredientUnitMeasureUnits,
    ...(ing.measureUnits
      ? {
          measureUnit: {
            id: ing.measureUnits.id,
            name: ing.measureUnits.name,
            abbreviation: ing.measureUnits.abbreviation,
          },
        }
      : {}),
  };

  return {
    id: row.id,
    ingredientId: row.ingredientId,
    quantity: row.quantity,
    createdAt: row.createdAt,
    ingredient,
  };
}
