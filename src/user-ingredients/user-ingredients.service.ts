import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserIngredientDto } from './dto/create-user-ingredient.dto';
import { UpdateUserIngredientDto } from './dto/update-user-ingredient.dto';
import {
  mapUserIngredientToResponse,
  type UserIngredientApiResponse,
} from './user-ingredient.mapper';
import {
  isPrismaKnownRequestError,
  logAndRethrow,
} from '../common/utils/service-error.util';

const userIngredientInclude = {
  ingredients: {
    select: {
      id: true,
      name: true,
      imageUrl: true,
      measureUnits: {
        select: {
          id: true,
          name: true,
          abbreviation: true,
        },
      },
      /** Conversões cadastradas em `ingredient_units` + unidade em `measure_units` */
      ingredientUnits: {
        select: {
          measureUnitsId: true,
          measureUnits: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class UserIngredientsService {
  private readonly logger = new Logger(UserIngredientsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    dto: CreateUserIngredientDto,
  ): Promise<UserIngredientApiResponse> {
    try {
      const row = await this.prisma.userIngredients.create({
        data: {
          userId,
          ingredientId: dto.ingredientId,
          quantity: dto.quantity,
        },
        include: userIngredientInclude,
      });

      return mapUserIngredientToResponse(row);
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2003') {
        this.logger.warn(
          `FK inválida ao criar user ingredient (ingredientId: ${dto.ingredientId})`,
        );
        throw new BadRequestException(
          'Ingrediente (ingredientId) inválido ou inexistente',
        );
      }

      logAndRethrow(
        this.logger,
        `Erro ao criar ingrediente do usuário (userId: ${userId})`,
        error,
      );
    }
  }

  async findAllByUser(userId: string): Promise<UserIngredientApiResponse[]> {
    try {
      const rows = await this.prisma.userIngredients.findMany({
        where: { userId },
        include: userIngredientInclude,
        orderBy: { createdAt: 'desc' },
      });

      return rows.map((row) => mapUserIngredientToResponse(row));
    } catch (error) {
      logAndRethrow(
        this.logger,
        `Erro ao listar ingredientes do usuário (userId: ${userId})`,
        error,
      );
    }
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateUserIngredientDto,
  ): Promise<UserIngredientApiResponse> {
    if (dto.ingredientId === undefined && dto.quantity === undefined) {
      throw new BadRequestException(
        'Informe ao menos um campo: ingredientId ou quantity',
      );
    }

    const existing = await this.prisma.userIngredients.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Registro não encontrado');
    }

    const data: { ingredientId?: string; quantity?: string } = {};
    if (dto.ingredientId !== undefined) data.ingredientId = dto.ingredientId;
    if (dto.quantity !== undefined) data.quantity = dto.quantity;

    try {
      const row = await this.prisma.userIngredients.update({
        where: { id },
        data,
        include: userIngredientInclude,
      });

      return mapUserIngredientToResponse(row);
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2003') {
        this.logger.warn(
          `FK inválida ao atualizar user ingredient (ingredientId: ${dto.ingredientId})`,
        );
        throw new BadRequestException(
          'Ingrediente (ingredientId) inválido ou inexistente',
        );
      }

      logAndRethrow(
        this.logger,
        `Erro ao atualizar ingrediente do usuário (id: ${id})`,
        error,
      );
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.userIngredients.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Registro não encontrado');
    }

    try {
      await this.prisma.userIngredients.delete({
        where: { id },
      });
    } catch (error) {
      logAndRethrow(
        this.logger,
        `Erro ao excluir ingrediente do usuário (id: ${id})`,
        error,
      );
    }
  }
}
