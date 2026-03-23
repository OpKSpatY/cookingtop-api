import {
  Controller,
  Get,
  Post,
  Patch,
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
import { IngredientUnitsService } from './ingredient-units.service';
import { CreateIngredientUnitDto } from './dto/create-ingredient-unit.dto';
import { UpdateIngredientUnitDto } from './dto/update-ingredient-unit.dto';

@ApiTags('ingredient-units')
@ApiBearerAuth()
@Controller('ingredient-units')
@UseGuards(AuthGuard('jwt'))
export class IngredientUnitsController {
  constructor(
    private readonly ingredientUnitsService: IngredientUnitsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar todas as conversões ingrediente × unidade de medida',
  })
  @ApiResponse({ status: 200, description: 'Lista' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async findAll() {
    return this.ingredientUnitsService.findAll();
  }

  @Post('upsert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Criar ou atualizar (mesmo ingrediente + mesma unidade de medida). Ideal para uma única aba no frontend.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Registro retornado com upsertAction: created | updated',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou FK inválida' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async upsert(@Body() dto: CreateIngredientUnitDto) {
    return this.ingredientUnitsService.upsert(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar um registro por id' })
  @ApiParam({ name: 'id', description: 'UUID do ingredient_unit' })
  @ApiResponse({ status: 200, description: 'Encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Não encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ingredientUnitsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar conversão gramas ↔ unidade de medida' })
  @ApiResponse({ status: 201, description: 'Criado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou FK inválida' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async create(@Body() dto: CreateIngredientUnitDto) {
    return this.ingredientUnitsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar registro' })
  @ApiParam({ name: 'id', description: 'UUID do ingredient_unit' })
  @ApiResponse({ status: 200, description: 'Atualizado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Não encontrado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIngredientUnitDto,
  ) {
    return this.ingredientUnitsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir registro' })
  @ApiParam({ name: 'id', description: 'UUID do ingredient_unit' })
  @ApiResponse({ status: 204, description: 'Excluído' })
  @ApiResponse({ status: 400, description: 'Não pode excluir (referências)' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Não encontrado' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.ingredientUnitsService.remove(id);
  }
}
