import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { MeasureUnits } from '../../generated/prisma/client';
import { CreateMeasureUnitDto } from './dto/create-measure-unit.dto';
import {
  isPrismaKnownRequestError,
  logAndRethrow,
} from '../common/utils/service-error.util';

@Injectable()
export class MeasureUnitsService {
  private readonly logger = new Logger(MeasureUnitsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMeasureUnitDto): Promise<MeasureUnits> {
    try {
      return await this.prisma.measureUnits.create({
        data: {
          name: dto.name,
          abbreviation: dto.abbreviation,
          measureTypesId: dto.measureTypesId,
        },
      });
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2003') {
        this.logger.warn(
          `FK inválida ao criar measure unit (measureTypesId: ${dto.measureTypesId})`,
        );
        throw new BadRequestException(
          'Tipo de medida (measureTypesId) inválido ou inexistente',
        );
      }

      logAndRethrow(
        this.logger,
        `Erro ao criar measure unit (name: ${dto.name})`,
        error,
      );
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.measureUnits.delete({
        where: { id },
      });
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2025') {
        this.logger.warn(
          `Measure unit não encontrada para exclusão (id: ${id})`,
        );
        throw new NotFoundException('Unidade de medida não encontrada');
      }

      logAndRethrow(
        this.logger,
        `Erro ao excluir measure unit (id: ${id})`,
        error,
      );
    }
  }
}
