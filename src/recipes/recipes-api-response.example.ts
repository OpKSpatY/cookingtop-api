/**
 * Formato JSON retornado em POST, GET e PATCH de `/recipes`
 * (Prisma serializa `Date` como string ISO).
 */
export const recipeWithStepsResponseExample = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  owner_id: '880e8400-e29b-41d4-a716-446655440099',
  title: 'Bolo de cenoura',
  description: 'Receita da vovó',
  imageUrl: null,
  difficulty: 'FACIL',
  prepTime: 45,
  servings: 8,
  isFeatured: false,
  is_private: false,
  createdAt: '2026-03-12T12:00:00.000Z',
  owner: {
    id: '880e8400-e29b-41d4-a716-446655440099',
    name: 'Maria Silva',
  },
  recipeIngredients: [
    {
      id: 'aa0e8400-e29b-41d4-a716-446655440010',
      recipeId: '550e8400-e29b-41d4-a716-446655440000',
      ingredientId: 'bb0e8400-e29b-41d4-a716-446655440020',
      amount: '200',
      note: null,
      createdAt: '2026-03-12T12:00:00.000Z',
      updatedAt: '2026-03-12T12:00:00.000Z',
      ingredients: {
        id: 'bb0e8400-e29b-41d4-a716-446655440020',
        name: 'Farinha de trigo',
        imageUrl: null,
        measureUnitsId: 'cc0e8400-e29b-41d4-a716-446655440030',
        measureUnits: {
          id: 'cc0e8400-e29b-41d4-a716-446655440030',
          name: 'Grama',
          abbreviation: 'g',
        },
      },
    },
  ],
  recipeSteps: [
    {
      id: '660e8400-e29b-41d4-a716-446655440001',
      recipeId: '550e8400-e29b-41d4-a716-446655440000',
      stepNumber: 1,
      description: 'Pré-aqueça o forno.',
      createdAt: '2026-03-12T12:00:00.000Z',
    },
    {
      id: '770e8400-e29b-41d4-a716-446655440002',
      recipeId: '550e8400-e29b-41d4-a716-446655440000',
      stepNumber: 2,
      description: 'Misture os ingredientes.',
      createdAt: '2026-03-12T12:00:00.000Z',
    },
  ],
} as const;
