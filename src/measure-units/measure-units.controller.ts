import {
  Controller,
  Get,
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
import { MeasureUnitsService } from './measure-units.service';
import { CreateMeasureUnitDto } from './dto/create-measure-unit.dto';

@ApiTags('measure-units')
@ApiBearerAuth()
@Controller('measure-units')
@UseGuards(AuthGuard('jwt'))
export class MeasureUnitsController {
  constructor(private readonly measureUnitsService: MeasureUnitsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar unidades de medida (id, name, abbreviation)',
  })
  @ApiResponse({ status: 200, description: 'Lista de unidades de medida' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async findAll() {
    return this.measureUnitsService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar uma unidade de medida' })
  @ApiResponse({ status: 201, description: 'Unidade de medida criada' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou FK inválida' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async create(@Body() dto: CreateMeasureUnitDto) {
    return this.measureUnitsService.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir uma unidade de medida pelo id' })
  @ApiParam({ name: 'id', description: 'UUID da unidade de medida' })
  @ApiResponse({ status: 204, description: 'Excluído com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Não encontrado' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.measureUnitsService.remove(id);
  }
}
