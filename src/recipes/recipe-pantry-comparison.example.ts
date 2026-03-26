/**
 * Exemplo de resposta de `GET /recipes/:id/pantry-comparison`
 */
export const recipePantryComparisonExample = {
  recipe_id: 'f9668574-3a26-45ce-baa5-df1f42327382',
  title: 'Teste',
  items: [
    {
      recipe_ingredient_id: '83e867f2-7f05-4955-a0d7-94926b75e5b7',
      ingredient_id: '943eefbe-7bf8-4303-80c0-d3e33da1d03f',
      ingredient_name: 'Leite',
      measure_units_id: 'f9bbb85b-aaae-42c1-a1b5-c51032b85b17',
      measure_unit: {
        id: 'f9bbb85b-aaae-42c1-a1b5-c51032b85b17',
        name: 'mililitro',
        abbreviation: 'ml',
      },
      ingredient_unit_id: '...uuid da linha em ingredient_units...',
      required_amount: '200',
      user_quantity_raw: '150',
      user_quantity_parsed: 150,
      quantity_parse_error: false,
      has_in_pantry: true,
      is_sufficient: false,
      shortage_amount: '50',
    },
  ],
  summary: {
    total_lines: 1,
    lines_with_stock: 1,
    lines_sufficient: 0,
    all_sufficient: false,
  },
} as const;
