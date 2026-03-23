import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Difficulty } from '../../../generated/prisma/client';
import { CreateRecipeIngredientItemDto } from './create-recipe-ingredient-item.dto';
import { CreateRecipeStepItemDto } from './create-recipe-step-item.dto';

export class UpdateRecipeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string | null;

  @ApiProperty({ enum: Difficulty, required: false })
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  prepTime?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  servings?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiProperty({
    required: false,
    type: [CreateRecipeIngredientItemDto],
    description:
      'Se enviado, substitui todos os ingredientes da receita pela nova lista',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientItemDto)
  @ArrayMinSize(1, {
    message: 'Se informar ingredients, envie ao menos um item',
  })
  ingredients?: CreateRecipeIngredientItemDto[];

  @ApiProperty({
    required: false,
    type: [CreateRecipeStepItemDto],
    description:
      'Se enviado, substitui todos os passos do modo de preparo pela nova lista',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepItemDto)
  @ArrayMinSize(1, {
    message: 'Se informar steps, envie ao menos um passo',
  })
  steps?: CreateRecipeStepItemDto[];
}
