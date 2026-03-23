import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserIngredientsService } from './user-ingredients.service';
import { CreateUserIngredientDto } from './dto/create-user-ingredient.dto';
import { UpdateUserIngredientDto } from './dto/update-user-ingredient.dto';

@ApiTags('user-ingredients')
@ApiBearerAuth()
@Controller('user-ingredients')
@UseGuards(AuthGuard('jwt'))
export class UserIngredientsController {
  constructor(
    private readonly userIngredientsService: UserIngredientsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar ingrediente à despensa do usuário' })
  @ApiResponse({ status: 201, description: 'Criado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou FK inválida' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async create(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateUserIngredientDto,
  ) {
    return this.userIngredientsService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar ingredientes do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de ingredientes do usuário' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async findAll(@Request() req: { user: { userId: string } }) {
    return this.userIngredientsService.findAllByUser(req.user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar quantidade ou ingrediente vinculado' })
  @ApiParam({ name: 'id', description: 'UUID do registro em user_ingredients' })
  @ApiResponse({ status: 200, description: 'Atualizado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Não encontrado' })
  async update(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserIngredientDto,
  ) {
    return this.userIngredientsService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover ingrediente da despensa' })
  @ApiParam({ name: 'id', description: 'UUID do registro em user_ingredients' })
  @ApiResponse({ status: 204, description: 'Excluído' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Não encontrado' })
  async remove(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.userIngredientsService.remove(req.user.userId, id);
  }
}
