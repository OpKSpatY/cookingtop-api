import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Ingredients } from '../../generated/prisma/client';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import {
  isPrismaKnownRequestError,
  logAndRethrow,
} from '../common/utils/service-error.util';

@Injectable()
export class IngredientsService {
  private readonly logger = new Logger(IngredientsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateIngredientDto): Promise<Ingredients> {
    try {
      return await this.prisma.ingredients.create({
        data: {
          name: dto.name,
          measureUnitsId: dto.measureUnitsId,
        },
      });
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2003') {
        this.logger.warn(
          `FK inválida ao criar ingrediente (measureUnitsId: ${dto.measureUnitsId})`,
        );
        throw new BadRequestException(
          'Unidade de medida (measureUnitsId) inválida ou inexistente',
        );
      }

      logAndRethrow(
        this.logger,
        `Erro ao criar ingrediente (name: ${dto.name})`,
        error,
      );
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.ingredients.delete({
        where: { id },
      });
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2025') {
        this.logger.warn(
          `Ingrediente não encontrado para exclusão (id: ${id})`,
        );
        throw new NotFoundException('Ingrediente não encontrado');
      }

      logAndRethrow(
        this.logger,
        `Erro ao excluir ingrediente (id: ${id})`,
        error,
      );
    }
  }
}
