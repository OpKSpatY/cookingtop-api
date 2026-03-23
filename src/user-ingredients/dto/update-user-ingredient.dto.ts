import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserIngredientDto {
  @ApiProperty({
    required: false,
    description: 'UUID de outro ingrediente (substituir vínculo)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ingredientId deve ser um UUID válido' })
  ingredientId?: string;

  @ApiProperty({ required: false, example: '750' })
  @IsOptional()
  @IsString({ message: 'quantity deve ser um texto' })
  @MaxLength(100, { message: 'quantity deve ter no máximo 100 caracteres' })
  quantity?: string;
}
