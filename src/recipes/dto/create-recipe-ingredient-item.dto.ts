import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateRecipeIngredientItemDto {
  @ApiProperty({
    description: 'UUID do ingrediente cadastrado (tabela ingredients)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'ingredientId é obrigatório' })
  @IsUUID('4', { message: 'ingredientId deve ser um UUID válido' })
  ingredientId: string;

  @ApiProperty({
    example: 200,
    description: 'Quantidade (aceita decimais, ex.: 0.5)',
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 6 },
    { message: 'amount deve ser um número' },
  )
  @IsPositive({ message: 'amount deve ser maior que zero' })
  amount: number;

  @ApiProperty({
    required: false,
    description: 'Observação opcional (ex.: "picado", "a gosto")',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  note?: string | null;
}
