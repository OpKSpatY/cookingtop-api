import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Difficulty } from '../../../generated/prisma/client';
import { CreateRecipeIngredientItemDto } from './create-recipe-ingredient-item.dto';
import { CreateRecipeStepItemDto } from './create-recipe-step-item.dto';

export class CreateRecipeDto {
  @ApiProperty({ example: 'Bolo de cenoura' })
  @IsNotEmpty({ message: 'title é obrigatório' })
  @IsString()
  @MaxLength(300, { message: 'title deve ter no máximo 300 caracteres' })
  title: string;

  @ApiProperty({
    required: false,
    description: 'Descrição opcional da receita',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string | null;

  @ApiProperty({ enum: Difficulty, example: Difficulty.FACIL })
  @IsEnum(Difficulty, { message: 'difficulty deve ser FACIL, MEDIO ou DIFICIL' })
  difficulty: Difficulty;

  @ApiProperty({
    example: 45,
    description: 'Tempo de preparo em minutos',
  })
  @Type(() => Number)
  @IsInt({ message: 'prepTime deve ser um número inteiro' })
  @Min(1, { message: 'prepTime deve ser >= 1' })
  prepTime: number;

  @ApiProperty({ example: 8, description: 'Número de porções' })
  @Type(() => Number)
  @IsInt({ message: 'servings deve ser um número inteiro' })
  @Min(1, { message: 'servings deve ser >= 1' })
  servings: number;

  @ApiProperty({
    required: false,
    default: false,
    description: 'Receita visível só para o criador',
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiProperty({
    type: [CreateRecipeIngredientItemDto],
    description:
      'Ingredientes da receita (UUIDs do cadastro global de ingredientes)',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientItemDto)
  @ArrayMinSize(1, {
    message: 'Informe ao menos um ingrediente (ingredients)',
  })
  ingredients: CreateRecipeIngredientItemDto[];

  @ApiProperty({
    type: [CreateRecipeStepItemDto],
    description:
      'Modo de preparo: ordem dos passos é a ordem do array (1º item = passo 1)',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepItemDto)
  @ArrayMinSize(1, {
    message: 'Informe ao menos um passo do modo de preparo (steps)',
  })
  steps: CreateRecipeStepItemDto[];
}
