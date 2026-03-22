import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIngredientDto {
  @ApiProperty({ example: 'Farinha de trigo', description: 'Nome do ingrediente' })
  @IsNotEmpty({ message: 'name é obrigatório' })
  @IsString({ message: 'name deve ser um texto' })
  @MaxLength(200, { message: 'name deve ter no máximo 200 caracteres' })
  name: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID da unidade de medida padrão (measure_units)',
  })
  @IsNotEmpty({ message: 'measureUnitsId é obrigatório' })
  @IsUUID('4', { message: 'measureUnitsId deve ser um UUID válido' })
  measureUnitsId: string;
}
