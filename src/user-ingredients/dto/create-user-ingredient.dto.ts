import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserIngredientDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID do ingrediente (tabela ingredients)',
  })
  @IsNotEmpty({ message: 'ingredientId é obrigatório' })
  @IsUUID('4', { message: 'ingredientId deve ser um UUID válido' })
  ingredientId: string;

  @ApiProperty({ example: '500', description: 'Quantidade (texto livre, ex.: 500g, 2 un)' })
  @IsNotEmpty({ message: 'quantity é obrigatório' })
  @IsString({ message: 'quantity deve ser um texto' })
  @MaxLength(100, { message: 'quantity deve ter no máximo 100 caracteres' })
  quantity: string;
}
