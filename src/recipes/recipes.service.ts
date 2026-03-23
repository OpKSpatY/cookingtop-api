import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import {
  isPrismaKnownRequestError,
  logAndRethrow,
} from '../common/utils/service-error.util';
import {
  mapRecipeToApiResponse,
  recipeInclude,
  type RecipeApiResponse,
} from './recipe-response.mapper';

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Receitas públicas ou receitas privadas cujo dono é o usuário.
   * (Prisma: `isPrivate` / `ownerId` mapeados para colunas snake_case no DB.)
   */
  private visibilityWhere(userId: string) {
    return {
      OR: [{ isPrivate: false }, { ownerId: userId }],
    };
  }

  async create(userId: string, dto: CreateRecipeDto): Promise<RecipeApiResponse> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const recipe = await tx.recipes.create({
          data: {
            ownerId: userId,
            title: dto.title,
            description: dto.description ?? undefined,
            imageUrl: dto.imageUrl ?? undefined,
            difficulty: dto.difficulty,
            prepTime: dto.prepTime,
            servings: dto.servings,
            isPrivate: dto.isPrivate ?? false,
            isFeatured: false,
          },
        });

        await tx.recipeSteps.createMany({
          data: dto.steps.map((s, index) => ({
            recipeId: recipe.id,
            stepNumber: index + 1,
            description: s.description,
          })),
        });

        await tx.recipeIngredients.createMany({
          data: dto.ingredients.map((ing) => ({
            recipeId: recipe.id,
            ingredientId: ing.ingredientId,
            amount: new Prisma.Decimal(String(ing.amount)),
            ...(ing.note !== undefined && ing.note !== null && ing.note !== ''
              ? { note: ing.note }
              : {}),
          })),
        });

        await tx.userRecipes.create({
          data: { userId, recipeId: recipe.id },
        });

        const created = await tx.recipes.findUniqueOrThrow({
          where: { id: recipe.id },
          include: recipeInclude,
        });
        return mapRecipeToApiResponse(created);
      });
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2003') {
        this.logger.warn(
          `FK inválida ao criar receita (ingredientId inexistente ou inválido)`,
        );
        throw new BadRequestException(
          'Um ou mais ingredientId são inválidos ou não existem',
        );
      }
      logAndRethrow(
        this.logger,
        `Erro ao criar receita (userId: ${userId})`,
        error,
      );
    }
  }

  async findAll(userId: string): Promise<RecipeApiResponse[]> {
    try {
      const rows = await this.prisma.recipes.findMany({
        where: this.visibilityWhere(userId),
        include: recipeInclude,
        orderBy: { createdAt: 'desc' },
      });
      return rows.map((row) => mapRecipeToApiResponse(row));
    } catch (error) {
      logAndRethrow(this.logger, 'Erro ao listar receitas', error);
    }
  }

  async findOne(userId: string, id: string): Promise<RecipeApiResponse> {
    const recipe = await this.prisma.recipes.findFirst({
      where: { id, ...this.visibilityWhere(userId) },
      include: recipeInclude,
    });

    if (!recipe) {
      throw new NotFoundException('Receita não encontrada');
    }

    return mapRecipeToApiResponse(recipe);
  }

  private async assertUserOwnsRecipe(userId: string, recipeId: string) {
    const row = await this.prisma.recipes.findFirst({
      where: { id: recipeId },
      select: { ownerId: true },
    });
    if (!row || row.ownerId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para alterar esta receita',
      );
    }
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateRecipeDto,
  ): Promise<RecipeApiResponse> {
    const hasRecipeField =
      dto.title !== undefined ||
      dto.description !== undefined ||
      dto.imageUrl !== undefined ||
      dto.difficulty !== undefined ||
      dto.prepTime !== undefined ||
      dto.servings !== undefined ||
      dto.isPrivate !== undefined;

    if (
      !hasRecipeField &&
      dto.steps === undefined &&
      dto.ingredients === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizar (ou substitua steps e/ou ingredients)',
      );
    }

    await this.assertUserOwnsRecipe(userId, id);

    const existing = await this.prisma.recipes.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Receita não encontrada');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (hasRecipeField) {
          await tx.recipes.update({
            where: { id },
            data: {
              ...(dto.title !== undefined && { title: dto.title }),
              ...(dto.description !== undefined && {
                description: dto.description,
              }),
              ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
              ...(dto.difficulty !== undefined && {
                difficulty: dto.difficulty,
              }),
              ...(dto.prepTime !== undefined && { prepTime: dto.prepTime }),
              ...(dto.servings !== undefined && { servings: dto.servings }),
              ...(dto.isPrivate !== undefined && { isPrivate: dto.isPrivate }),
            },
          });
        }

        if (dto.steps !== undefined) {
          await tx.recipeSteps.deleteMany({ where: { recipeId: id } });
          await tx.recipeSteps.createMany({
            data: dto.steps.map((s, index) => ({
              recipeId: id,
              stepNumber: index + 1,
              description: s.description,
            })),
          });
        }

        if (dto.ingredients !== undefined) {
          await tx.recipeIngredients.deleteMany({ where: { recipeId: id } });
          await tx.recipeIngredients.createMany({
            data: dto.ingredients.map((ing) => ({
              recipeId: id,
              ingredientId: ing.ingredientId,
              amount: new Prisma.Decimal(String(ing.amount)),
              ...(ing.note !== undefined && ing.note !== null && ing.note !== ''
                ? { note: ing.note }
                : {}),
            })),
          });
        }

        const updated = await tx.recipes.findUniqueOrThrow({
          where: { id },
          include: recipeInclude,
        });
        return mapRecipeToApiResponse(updated);
      });
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2003') {
        this.logger.warn(
          `FK inválida ao atualizar receita (ingredientId inexistente)`,
        );
        throw new BadRequestException(
          'Um ou mais ingredientId são inválidos ou não existem',
        );
      }
      logAndRethrow(
        this.logger,
        `Erro ao atualizar receita (id: ${id})`,
        error,
      );
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.assertUserOwnsRecipe(userId, id);

    try {
      await this.prisma.recipes.delete({
        where: { id },
      });
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2025') {
        throw new NotFoundException('Receita não encontrada');
      }
      logAndRethrow(this.logger, `Erro ao excluir receita (id: ${id})`, error);
    }
  }
}
