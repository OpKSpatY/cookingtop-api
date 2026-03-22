import { IsNotEmpty, IsEmail, MinLength, IsOptional, IsInt, IsString, MaxLength } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDto {
  @ApiProperty({ example: 'usuario@email.com' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  @IsEmail({}, { message: 'Email inválido' })
  readonly email: string;

  @ApiProperty({ example: 'senha123' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  readonly password: string;
}

export class CreateUserDto {
  @ApiProperty({ example: 'João Silva' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @ApiProperty({ example: 'joao@email.com' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({ example: 'senha123', minLength: 6 })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  password: string;
}
export class UpdateUserDto {
  @ApiProperty({ example: 1, description: 'ID do avatar selecionado', required: false })
  @IsOptional()
  @IsInt({ message: 'avatarId deve ser um número inteiro' })
  avatarId?: number;

  @ApiProperty({ example: 'Amo cozinhar receitas caseiras!', description: 'Descrição do perfil', required: false })
  @IsOptional()
  @IsString({ message: 'profileDescription deve ser um texto' })
  @MaxLength(500, { message: 'profileDescription deve ter no máximo 500 caracteres' })
  profileDescription?: string | null;
}

export class UpdatePasswordDto {
  @ApiProperty()
  @IsNotEmpty({ message: 'Nova senha é obrigatória' })
  @MinLength(6, { message: 'Nova senha deve ter no mínimo 6 caracteres' })
  new_password: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'Senha atual é obrigatória' })
  old_password: string;
}