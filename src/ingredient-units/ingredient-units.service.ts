import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { IngredientUnits } from '../../generated/prisma/client';
import { CreateIngredientUnitDto } from './dto/create-ingredient-unit.dto';
import { UpdateIngredientUnitDto } from './dto/update-ingredient-unit.dto';
import {
  isPrismaKnownRequestError,
  logAndRethrow,
} from '../common/utils/service-error.util';

const ingredientUnitInclude = {
  ingredients: {
    select: {
      id: true,
      name: true,
      imageUrl: true,
    },
  },
  measureUnits: {
    select: {
      id: true,
      name: true,
      abbreviation: true,
    },
  },
} as const;

@Injectable()
export class IngredientUnitsService {
  private readonly logger = new Logger(IngredientUnitsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.ingredientUnits.findMany({
        include: ingredientUnitInclude,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logAndRethrow(
        this.logger,
        'Erro ao listar ingredient_units',
        error,
      );
    }
  }

  async findOne(id: string) {
    try {
      const row = await this.prisma.ingredientUnits.findUnique({
        where: { id },
        include: ingredientUnitInclude,
      });

      if (!row) {
        throw new NotFoundException('Registro não encontrado');
      }

      return row;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      logAndRethrow(
        this.logger,
        `Erro ao buscar ingredient_unit (id: ${id})`,
        error,
      );
    }
  }

  /**
   * Cria ou atualiza pela combinação (ingredientId + measureUnitsId).
   * Se já existir linha com o mesmo par, apenas atualiza gramsEquivalent.
   */
  async upsert(
    dto: CreateIngredientUnitDto,
  ): Promise<IngredientUnits & { upsertAction: 'created' | 'updated' }> {
    try {
      const existing = await this.prisma.ingredientUnits.findFirst({
        where: {
          ingredientId: dto.ingredientId,
          measureUnitsId: dto.measureUnitsId,
        },
      });

      if (existing) {
        const row = await this.prisma.ingredientUnits.update({
          where: { id: existing.id },
          data: { gramsEquivalent: dto.gramsEquivalent },
          include: ingredientUnitInclude,
        });
        return { ...row, upsertAction: 'updated' };
      }

      const row = await this.prisma.ingredientUnits.create({
        data: {
          ingredientId: dto.ingredientId,
          measureUnitsId: dto.measureUnitsId,
          gramsEquivalent: dto.gramsEquivalent,
        },
        include: ingredientUnitInclude,
      });
      return { ...row, upsertAction: 'created' };
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2003') {
        this.logger.warn(
          `FK inválida no upsert ingredient_unit (ingredientId: ${dto.ingredientId}, measureUnitsId: ${dto.measureUnitsId})`,
        );
        throw new BadRequestException(
          'ingredientId ou measureUnitsId inválido ou inexistente',
        );
      }

      logAndRethrow(this.logger, 'Erro no upsert de ingredient_unit', error);
    }
  }

  async create(dto: CreateIngredientUnitDto): Promise<IngredientUnits> {
    try {
      return await this.prisma.ingredientUnits.create({
        data: {
          ingredientId: dto.ingredientId,
          measureUnitsId: dto.measureUnitsId,
          gramsEquivalent: dto.gramsEquivalent,
        },
        include: ingredientUnitInclude,
      });
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2003') {
        this.logger.warn(
          `FK inválida ao criar ingredient_unit (ingredientId: ${dto.ingredientId}, measureUnitsId: ${dto.measureUnitsId})`,
        );
        throw new BadRequestException(
          'ingredientId ou measureUnitsId inválido ou inexistente',
        );
      }

      logAndRethrow(
        this.logger,
        'Erro ao criar ingredient_unit',
        error,
      );
    }
  }

  async update(
    id: string,
    dto: UpdateIngredientUnitDto,
  ): Promise<IngredientUnits> {
    if (
      dto.ingredientId === undefined &&
      dto.measureUnitsId === undefined &&
      dto.gramsEquivalent === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo: ingredientId, measureUnitsId ou gramsEquivalent',
      );
    }

    const existing = await this.prisma.ingredientUnits.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Registro não encontrado');
    }

    const data: {
      ingredientId?: string;
      measureUnitsId?: string;
      gramsEquivalent?: number;
    } = {};
    if (dto.ingredientId !== undefined) data.ingredientId = dto.ingredientId;
    if (dto.measureUnitsId !== undefined)
      data.measureUnitsId = dto.measureUnitsId;
    if (dto.gramsEquivalent !== undefined)
      data.gramsEquivalent = dto.gramsEquivalent;

    try {
      return await this.prisma.ingredientUnits.update({
        where: { id },
        data,
        include: ingredientUnitInclude,
      });
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2003') {
        this.logger.warn(
          `FK inválida ao atualizar ingredient_unit (id: ${id})`,
        );
        throw new BadRequestException(
          'ingredientId ou measureUnitsId inválido ou inexistente',
        );
      }

      logAndRethrow(
        this.logger,
        `Erro ao atualizar ingredient_unit (id: ${id})`,
        error,
      );
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.ingredientUnits.delete({
        where: { id },
      });
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2025') {
        this.logger.warn(
          `ingredient_unit não encontrado para exclusão (id: ${id})`,
        );
        throw new NotFoundException('Registro não encontrado');
      }

      if (isPrismaKnownRequestError(error) && error.code === 'P2003') {
        this.logger.warn(
          `FK impede exclusão de ingredient_unit (id: ${id})`,
        );
        throw new BadRequestException(
          'Não é possível excluir: registro referenciado por outra tabela',
        );
      }

      logAndRethrow(
        this.logger,
        `Erro ao excluir ingredient_unit (id: ${id})`,
        error,
      );
    }
  }
}
