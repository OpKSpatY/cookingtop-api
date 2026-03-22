import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMeasureUnitDto {
  @ApiProperty({ example: 'Quilograma', description: 'Nome da unidade de medida' })
  @IsNotEmpty({ message: 'name é obrigatório' })
  @IsString({ message: 'name deve ser um texto' })
  @MaxLength(100, { message: 'name deve ter no máximo 100 caracteres' })
  name: string;

  @ApiProperty({ example: 'kg', description: 'Abreviação' })
  @IsNotEmpty({ message: 'abbreviation é obrigatório' })
  @IsString({ message: 'abbreviation deve ser um texto' })
  @MaxLength(20, { message: 'abbreviation deve ter no máximo 20 caracteres' })
  abbreviation: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID do tipo de medida (measure_types)',
  })
  @IsNotEmpty({ message: 'measureTypesId é obrigatório' })
  @IsUUID('4', { message: 'measureTypesId deve ser um UUID válido' })
  measureTypesId: string;
}
