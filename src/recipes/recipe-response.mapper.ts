import type { Prisma } from '../../generated/prisma/client';

/** Include compartilhado entre `RecipesService` e o mapper de resposta. */
export const recipeInclude = {
  recipeSteps: {
    orderBy: { stepNumber: 'asc' as const },
  },
  recipeIngredients: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      ingredients: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          measureUnitsId: true,
          measureUnits: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
            },
          },
        },
      },
    },
  },
  owner: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

type RecipeWithRelations = Prisma.RecipesGetPayload<{
  include: typeof recipeInclude;
}>;

/**
 * Resposta HTTP com `owner_id` e `is_private` em snake_case
 * (o Prisma continua usando `ownerId` e `isPrivate` no schema).
 */
export type RecipeApiResponse = Omit<
  RecipeWithRelations,
  'ownerId' | 'isPrivate'
> & {
  owner_id: string;
  is_private: boolean;
};

export function mapRecipeToApiResponse(row: RecipeWithRelations): RecipeApiResponse {
  const { ownerId, isPrivate, ...rest } = row;
  return {
    ...rest,
    owner_id: ownerId,
    is_private: isPrivate,
  };
}
