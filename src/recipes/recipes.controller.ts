import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { recipeWithStepsResponseExample } from './recipes-api-response.example';
import { recipePantryComparisonExample } from './recipe-pantry-comparison.example';
import { recipePantryAvailabilityExample } from './recipe-pantry-availability.example';
import { isIfNoneMatchSatisfied } from '../common/utils/conditional-request.util';

@ApiTags('recipes')
@ApiBearerAuth()
@Controller('recipes')
@UseGuards(AuthGuard('jwt'))
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Criar receita com ingredientes (ingredients), modo de preparo (steps) e vínculo ao usuário.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Receita criada; corpo = receita completa com recipeSteps (ordenados por stepNumber)',
    schema: { example: recipeWithStepsResponseExample },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async create(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateRecipeDto,
  ) {
    return this.recipesService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar receitas (públicas + receitas privadas do usuário autenticado)',
  })
  @ApiResponse({ status: 200, description: 'Lista de receitas com passos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async findAll(@Request() req: { user: { userId: string } }) {
    return this.recipesService.findAll(req.user.userId);
  }

  @Get('pantry-availability')
  @ApiOperation({
    summary:
      'Listar receitas visíveis separadas em pode fazer / não pode fazer com a despensa atual',
    description:
      'Mesmo critério de `GET /recipes/:id/pantry-comparison`: soma de `user_ingredients` por ingrediente vs `recipe_ingredients.amount`. Receitas sem ingredientes vão em `can_make`.\n\n' +
      '**Cache condicional:** resposta com header `ETag`. Envie `If-None-Match` com o valor recebido; se nada mudou, a API responde **304** sem corpo.',
  })
  @ApiResponse({
    status: 200,
    description:
      '`can_make` e `cannot_make`: arrays no formato de `GET /recipes`. Headers: `ETag`, `Cache-Control`, `Vary`.',
    schema: { example: recipePantryAvailabilityExample },
  })
  @ApiResponse({
    status: 304,
    description:
      'Não modificado — reutilize o payload em cache (corpo vazio). Reenvie o mesmo `If-None-Match` até receber 200.',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async findAllGroupedByPantry(
    @Request() req: { user: { userId: string } },
    @Req() reqHttp: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const userId = req.user.userId;
    const etag = await this.recipesService.getPantryAvailabilityEtag(userId);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, no-cache');
    res.setHeader('Vary', 'Authorization');

    const inm = reqHttp.headers['if-none-match'];
    if (isIfNoneMatchSatisfied(inm, etag)) {
      res.status(HttpStatus.NOT_MODIFIED);
      return;
    }

    return this.recipesService.findAllGroupedByPantry(userId);
  }

  @Get(':id/pantry-comparison')
  @ApiOperation({
    summary:
      'Comparar ingredientes da receita com a despensa do usuário (quantidades na mesma unidade do ingrediente)',
  })
  @ApiParam({ name: 'id', description: 'UUID da receita' })
  @ApiResponse({
    status: 200,
    description:
      'Por linha: necessário vs quantidade na despensa, falta (`shortage_amount`) e resumo',
    schema: { example: recipePantryComparisonExample },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Receita não encontrada ou sem acesso' })
  async getPantryComparison(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.recipesService.getPantryComparison(req.user.userId, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar receita por id (com modo de preparo)' })
  @ApiParam({ name: 'id', description: 'UUID da receita' })
  @ApiResponse({ status: 200, description: 'Receita encontrada' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Não encontrada ou sem acesso' })
  async findOne(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.recipesService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Atualizar receita (apenas o criador). Opcional: steps substitui todos os passos.',
    description:
      '**Retorno:** objeto da receita igual ao GET — inclui `recipeSteps` já atualizados (novos ids após substituir passos). Status **200**.',
  })
  @ApiParam({ name: 'id', description: 'UUID da receita' })
  @ApiResponse({
    status: 200,
    description:
      'Receita após update; sempre inclui `recipeSteps` ordenados por stepNumber',
    schema: { example: recipeWithStepsResponseExample },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Não encontrado' })
  async update(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecipeDto,
  ) {
    return this.recipesService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir receita (apenas o criador)' })
  @ApiParam({ name: 'id', description: 'UUID da receita' })
  @ApiResponse({ status: 204, description: 'Excluído' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Não encontrado' })
  async remove(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.recipesService.remove(req.user.userId, id);
  }
}
