import { createHash } from 'node:crypto';
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Ingredients } from '../../generated/prisma/client';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import {
  isPrismaKnownRequestError,
  logAndRethrow,
} from '../common/utils/service-error.util';
import { formatStrongEtag } from '../common/utils/conditional-request.util';

@Injectable()
export class IngredientsService {
  private readonly logger = new Logger(IngredientsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * ETag do catálogo: muda quando ingredientes ou unidades de medida exibidas mudam.
   */
  async getIngredientsCatalogEtag(): Promise<string> {
    const [ingAgg, measureUnitsRows] = await Promise.all([
      this.prisma.ingredients.aggregate({
        _count: true,
        _max: { updatedAt: true, createdAt: true },
      }),
      this.prisma.measureUnits.findMany({
        select: { id: true, name: true, abbreviation: true },
        orderBy: { id: 'asc' },
      }),
    ]);

    const fingerprint = JSON.stringify({
      ingredientsCount: ingAgg._count,
      ingredientsMaxUpdatedAt:
        ingAgg._max.updatedAt?.toISOString() ?? null,
      ingredientsMaxCreatedAt:
        ingAgg._max.createdAt?.toISOString() ?? null,
      measureUnits: measureUnitsRows,
    });

    const hash = createHash('sha256').update(fingerprint).digest('hex');
    return formatStrongEtag(hash);
  }

  async findAll() {
    try {
      return await this.prisma.ingredients.findMany({
        select: {
          id: true,
          name: true,
          imageUrl: true,
          measureUnitsId: true,
          createdAt: true,
          updatedAt: true,
          measureUnits: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      logAndRethrow(this.logger, 'Erro ao listar ingredientes', error);
    }
  }

  async create(dto: CreateIngredientDto): Promise<Ingredients> {
    try {
      return await this.prisma.ingredients.create({
        data: {
          name: dto.name,
          measureUnitsId: dto.measureUnitsId,
          ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
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

  async update(
    id: string,
    dto: UpdateIngredientDto,
  ): Promise<Ingredients> {
    if (
      dto.name === undefined &&
      dto.measureUnitsId === undefined &&
      dto.imageUrl === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo: name, measureUnitsId ou imageUrl',
      );
    }

    const existing = await this.prisma.ingredients.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Ingrediente não encontrado');
    }

    const data: {
      name?: string;
      measureUnitsId?: string;
      imageUrl?: string | null;
    } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.measureUnitsId !== undefined)
      data.measureUnitsId = dto.measureUnitsId;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;

    try {
      return await this.prisma.ingredients.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2003') {
        this.logger.warn(
          `FK inválida ao atualizar ingrediente (measureUnitsId: ${dto.measureUnitsId})`,
        );
        throw new BadRequestException(
          'Unidade de medida (measureUnitsId) inválida ou inexistente',
        );
      }

      logAndRethrow(
        this.logger,
        `Erro ao atualizar ingrediente (id: ${id})`,
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
