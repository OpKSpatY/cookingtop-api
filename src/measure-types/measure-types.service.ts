import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { MeasureTypes } from '../../generated/prisma/client';
import { CreateMeasureTypeDto } from './dto/create-measure-type.dto';
import {
  isPrismaKnownRequestError,
  logAndRethrow,
} from '../common/utils/service-error.util';

@Injectable()
export class MeasureTypesService {
  private readonly logger = new Logger(MeasureTypesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMeasureTypeDto): Promise<MeasureTypes> {
    try {
      return await this.prisma.measureTypes.create({
        data: { type: dto.type },
      });
    } catch (error) {
      logAndRethrow(
        this.logger,
        `Erro ao criar measure type (type: ${dto.type})`,
        error,
      );
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.measureTypes.delete({
        where: { id },
      });
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2025') {
        this.logger.warn(
          `Measure type não encontrado para exclusão (id: ${id})`,
        );
        throw new NotFoundException('Tipo de medida não encontrado');
      }

      logAndRethrow(
        this.logger,
        `Erro ao excluir measure type (id: ${id})`,
        error,
      );
    }
  }
}
