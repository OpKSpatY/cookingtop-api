import {
  Controller,
  Patch,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './users.user.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar dados do perfil do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async updateProfile(
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }
}
