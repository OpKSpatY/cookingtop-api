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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { recipeWithStepsResponseExample } from './recipes-api-response.example';
import { recipePantryComparisonExample } from './recipe-pantry-comparison.example';
import { recipePantryAvailabilityExample } from './recipe-pantry-availability.example';
import { isIfNoneMatchSatisfied } from '../common/utils/conditional-request.util';
import { SupabaseStorageService } from '../storage/supabase-storage.service';

@ApiTags('recipes')
@ApiBearerAuth()
@Controller('recipes')
@UseGuards(AuthGuard('jwt'))
export class RecipesController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly storageService: SupabaseStorageService,
  ) {}

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

  @Post('with-image')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Criar receita com upload de imagem (multipart/form-data)',
    description:
      'Envie o campo `data` com o JSON da receita (mesmo formato de `POST /recipes`) ' +
      'e o campo `image` com o arquivo da capa (jpeg, png ou webp, até 5 MB).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description: 'JSON com os dados da receita (mesmo payload de POST /recipes)',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Imagem de capa (jpeg, png ou webp, até 5 MB)',
        },
      },
      required: ['data'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Receita criada com imagem enviada ao storage',
    schema: { example: recipeWithStepsResponseExample },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou imagem fora do padrão' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async createWithImage(
    @Request() req: { user: { userId: string } },
    @Body('data') rawData: string,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    if (!rawData) {
      throw new BadRequestException('O campo "data" (JSON da receita) é obrigatório');
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawData);
    } catch {
      throw new BadRequestException('O campo "data" não contém JSON válido');
    }

    const dto = plainToInstance(CreateRecipeDto, parsed);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      const messages = errors.flatMap((e) =>
        Object.values(e.constraints ?? {}),
      );
      throw new BadRequestException(messages);
    }

    if (image) {
      dto.imageUrl = await this.storageService.uploadRecipeImage(
        req.user.userId,
        image,
      );
    }

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
