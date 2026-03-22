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
import { MeasureTypesService } from './measure-types.service';
import { CreateMeasureTypeDto } from './dto/create-measure-type.dto';

@ApiTags('measure-types')
@ApiBearerAuth()
@Controller('measure-types')
@UseGuards(AuthGuard('jwt'))
export class MeasureTypesController {
  constructor(private readonly measureTypesService: MeasureTypesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar um tipo de medida' })
  @ApiResponse({ status: 201, description: 'Tipo de medida criado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async create(@Body() dto: CreateMeasureTypeDto) {
    return this.measureTypesService.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir um tipo de medida pelo id' })
  @ApiParam({ name: 'id', description: 'UUID do tipo de medida' })
  @ApiResponse({ status: 204, description: 'Excluído com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Não encontrado' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.measureTypesService.remove(id);
  }
}
