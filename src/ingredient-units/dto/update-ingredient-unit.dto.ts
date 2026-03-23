import { Type } from 'class-transformer';
import { IsOptional, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateIngredientUnitDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('4', { message: 'ingredientId deve ser um UUID válido' })
  ingredientId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('4', { message: 'measureUnitsId deve ser um UUID válido' })
  measureUnitsId?: string;

  @ApiProperty({ required: false, example: 150 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 8 },
    { message: 'gramsEquivalent deve ser um número' },
  )
  @Min(0, { message: 'gramsEquivalent deve ser >= 0' })
  gramsEquivalent?: number;
}
