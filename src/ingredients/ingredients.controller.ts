import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
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
import { IngredientsService } from './ingredients.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';

@ApiTags('ingredients')
@ApiBearerAuth()
@Controller('ingredients')
@UseGuards(AuthGuard('jwt'))
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar um ingrediente' })
  @ApiResponse({ status: 201, description: 'Ingrediente criado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou FK inválida' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async create(@Body() dto: CreateIngredientDto) {
    return this.ingredientsService.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir um ingrediente pelo id' })
  @ApiParam({ name: 'id', description: 'UUID do ingrediente' })
  @ApiResponse({ status: 204, description: 'Excluído com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Não encontrado' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.ingredientsService.remove(id);
  }
}
