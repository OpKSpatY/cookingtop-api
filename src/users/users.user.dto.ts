import { IsNotEmpty, IsEmail, MinLength } from 'class-validator';

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
export class UpdatePasswordDto {
  @ApiProperty()
  @IsNotEmpty({ message: 'Nova senha é obrigatória' })
  @MinLength(6, { message: 'Nova senha deve ter no mínimo 6 caracteres' })
  new_password: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'Senha atual é obrigatória' })
  old_password: string;
}