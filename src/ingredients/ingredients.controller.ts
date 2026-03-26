import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { IngredientsService } from './ingredients.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { isIfNoneMatchSatisfied } from '../common/utils/conditional-request.util';

@ApiTags('ingredients')
@ApiBearerAuth()
@Controller('ingredients')
@UseGuards(AuthGuard('jwt'))
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar todos os ingredientes (com unidade de medida)',
    description:
      '**Cache condicional:** resposta com header `ETag`. Envie `If-None-Match` com o valor recebido; se nada mudou, a API responde **304** sem corpo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de ingredientes. Headers: `ETag`, `Cache-Control`, `Vary`.',
  })
  @ApiResponse({
    status: 304,
    description:
      'Não modificado — reutilize o payload em cache (corpo vazio). Reenvie o mesmo `If-None-Match` até receber 200.',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async findAll(
    @Req() reqHttp: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const etag = await this.ingredientsService.getIngredientsCatalogEtag();
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, no-cache');
    res.setHeader('Vary', 'Authorization');

    const inm = reqHttp.headers['if-none-match'];
    if (isIfNoneMatchSatisfied(inm, etag)) {
      res.status(HttpStatus.NOT_MODIFIED);
      return;
    }

    return this.ingredientsService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar um ingrediente' })
  @ApiResponse({ status: 201, description: 'Ingrediente criado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou FK inválida' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async create(@Body() dto: CreateIngredientDto) {
    return this.ingredientsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um ingrediente' })
  @ApiParam({ name: 'id', description: 'UUID do ingrediente' })
  @ApiResponse({ status: 200, description: 'Ingrediente atualizado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou FK inválida' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Não encontrado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIngredientDto,
  ) {
    return this.ingredientsService.update(id, dto);
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
