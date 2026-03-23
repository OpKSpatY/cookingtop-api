import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIngredientUnitDto {
  @ApiProperty({ description: 'UUID do ingrediente (ingredients)' })
  @IsNotEmpty({ message: 'ingredientId é obrigatório' })
  @IsUUID('4', { message: 'ingredientId deve ser um UUID válido' })
  ingredientId: string;

  @ApiProperty({ description: 'UUID da unidade de medida (measure_units)' })
  @IsNotEmpty({ message: 'measureUnitsId é obrigatório' })
  @IsUUID('4', { message: 'measureUnitsId deve ser um UUID válido' })
  measureUnitsId: string;

  @ApiProperty({
    example: 100,
    description: 'Equivalente em gramas para esta unidade (ex.: 1 xícara = 120g)',
  })
  @IsNotEmpty({ message: 'gramsEquivalent é obrigatório' })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 8 },
    { message: 'gramsEquivalent deve ser um número' },
  )
  @Min(0, { message: 'gramsEquivalent deve ser >= 0' })
  gramsEquivalent: number;
}
