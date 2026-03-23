import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateIngredientDto {
  @ApiProperty({ required: false, example: 'Farinha de trigo integral' })
  @IsOptional()
  @IsString({ message: 'name deve ser um texto' })
  @MaxLength(200, { message: 'name deve ter no máximo 200 caracteres' })
  name?: string;

  @ApiProperty({
    required: false,
    description: 'UUID da unidade de medida padrão (measure_units)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'measureUnitsId deve ser um UUID válido' })
  measureUnitsId?: string;

  @ApiProperty({
    required: false,
    example: 'https://exemplo.com/img.png',
    description: 'URL da imagem do ingrediente',
  })
  @IsOptional()
  @IsString({ message: 'imageUrl deve ser um texto' })
  @MaxLength(2048, { message: 'imageUrl deve ter no máximo 2048 caracteres' })
  imageUrl?: string | null;
}
