import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMeasureTypeDto {
  @ApiProperty({ example: 'Peso', description: 'Nome do tipo de medida' })
  @IsNotEmpty({ message: 'type é obrigatório' })
  @IsString({ message: 'type deve ser um texto' })
  @MaxLength(100, { message: 'type deve ter no máximo 100 caracteres' })
  type: string;
}
