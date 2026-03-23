import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRecipeStepItemDto {
  @ApiProperty({
    example: 'Misture os ingredientes secos em uma tigela.',
    description: 'Texto do passo do modo de preparo',
  })
  @IsNotEmpty({ message: 'description do passo é obrigatório' })
  @IsString({ message: 'description do passo deve ser um texto' })
  @MaxLength(5000, {
    message: 'description do passo deve ter no máximo 5000 caracteres',
  })
  description: string;
}
