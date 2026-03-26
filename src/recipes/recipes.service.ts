import { createHash } from 'node:crypto';
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
import {
  canMakeRecipeWithPantryTotals,
  parseUserQuantityString,
} from './recipe-pantry.util';
import { formatStrongEtag } from '../common/utils/conditional-request.util';

export type RecipePantryComparisonItem = {
  recipe_ingredient_id: string;
  ingredient_id: string;
  ingredient_name: string;
  measure_units_id: string;
  measure_unit: {
    id: string;
    name: string;
    abbreviation: string;
  };
  /** Linha em `ingredient_units` com o mesmo `measure_units_id` do ingrediente. */
  ingredient_unit_id: string | null;
  required_amount: string;
  user_quantity_raw: string | null;
  user_quantity_parsed: number | null;
  quantity_parse_error: boolean;
  has_in_pantry: boolean;
  is_sufficient: boolean;
  /** Quanto falta na mesma unidade (0 se suficiente ou sem estoque). */
  shortage_amount: string;
};

export type RecipePantryComparisonResponse = {
  recipe_id: string;
  title: string;
  items: RecipePantryComparisonItem[];
  summary: {
    total_lines: number;
    lines_with_stock: number;
    lines_sufficient: number;
    all_sufficient: boolean;
  };
};

/** Receitas visíveis ao usuário, separadas por dá ou não para fazer com a despensa atual. */
export type RecipesPantryAvailabilityResponse = {
  can_make: RecipeApiResponse[];
  cannot_make: RecipeApiResponse[];
};

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

  /**
   * Todas as receitas visíveis ao usuário, em `can_make` ou `cannot_make`
   * conforme a despensa (`user_ingredients`) cobre as quantidades de `recipe_ingredients`.
   */
  /**
   * Fingerprint barato para validação condicional (ETag) de `pantry-availability`.
   * Inclui metadados das receitas visíveis, marcas de ingredientes/passos e despensa
   * (`ingredient_id` + `quantity`) para refletir alterações de quantidade.
   */
  async getPantryAvailabilityEtag(userId: string): Promise<string> {
    const visibility = this.visibilityWhere(userId);

    const [recipesMeta, riAgg, rsAgg, pantryRows] = await Promise.all([
      this.prisma.recipes.findMany({
        where: visibility,
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          difficulty: true,
          prepTime: true,
          servings: true,
          isFeatured: true,
          isPrivate: true,
          createdAt: true,
          ownerId: true,
          owner: { select: { id: true, name: true } },
        },
        orderBy: { id: 'asc' },
      }),
      this.prisma.recipeIngredients.aggregate({
        where: { recipes: this.visibilityWhere(userId) },
        _max: { updatedAt: true },
      }),
      this.prisma.recipeSteps.aggregate({
        where: { recipes: this.visibilityWhere(userId) },
        _max: { createdAt: true },
      }),
      this.prisma.userIngredients.findMany({
        where: { userId },
        select: { ingredientId: true, quantity: true },
        orderBy: { ingredientId: 'asc' },
      }),
    ]);

    const fingerprint = JSON.stringify({
      recipes: recipesMeta,
      recipeIngredientsMaxUpdatedAt: riAgg._max.updatedAt?.toISOString() ?? null,
      recipeStepsMaxCreatedAt: rsAgg._max.createdAt?.toISOString() ?? null,
      pantry: pantryRows,
    });

    const hash = createHash('sha256').update(fingerprint).digest('hex');
    return formatStrongEtag(hash);
  }

  async findAllGroupedByPantry(
    userId: string,
  ): Promise<RecipesPantryAvailabilityResponse> {
    try {
      const rows = await this.prisma.recipes.findMany({
        where: this.visibilityWhere(userId),
        include: recipeInclude,
        orderBy: { createdAt: 'desc' },
      });

      const userRows = await this.prisma.userIngredients.findMany({
        where: { userId },
      });

      const totalsByIngredient = new Map<string, number>();
      for (const row of userRows) {
        const parsed = parseUserQuantityString(row.quantity);
        const add = parsed.value ?? 0;
        totalsByIngredient.set(
          row.ingredientId,
          (totalsByIngredient.get(row.ingredientId) ?? 0) + add,
        );
      }

      const can_make: RecipeApiResponse[] = [];
      const cannot_make: RecipeApiResponse[] = [];

      for (const row of rows) {
        const ok = canMakeRecipeWithPantryTotals(
          row.recipeIngredients,
          totalsByIngredient,
        );
        const mapped = mapRecipeToApiResponse(row);
        if (ok) {
          can_make.push(mapped);
        } else {
          cannot_make.push(mapped);
        }
      }

      return { can_make, cannot_make };
    } catch (error) {
      logAndRethrow(
        this.logger,
        `Erro ao listar receitas por despensa (userId: ${userId})`,
        error,
      );
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

  /**
   * Compara quantidades da receita com a despensa do usuário.
   * Unidade: a do cadastro do ingrediente (`ingredients.measure_units_id`), alinhada à linha em `ingredient_units`.
   */
  async getPantryComparison(
    userId: string,
    recipeId: string,
  ): Promise<RecipePantryComparisonResponse> {
    const recipe = await this.prisma.recipes.findFirst({
      where: { id: recipeId, ...this.visibilityWhere(userId) },
      select: {
        id: true,
        title: true,
        recipeIngredients: {
          orderBy: { createdAt: 'asc' },
          include: {
            ingredients: {
              select: {
                id: true,
                name: true,
                measureUnitsId: true,
                measureUnits: {
                  select: {
                    id: true,
                    name: true,
                    abbreviation: true,
                  },
                },
                ingredientUnits: {
                  select: {
                    id: true,
                    measureUnitsId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException('Receita não encontrada');
    }

    const ingredientIds = recipe.recipeIngredients.map(
      (ri) => ri.ingredientId,
    );
    const userRows =
      ingredientIds.length === 0
        ? []
        : await this.prisma.userIngredients.findMany({
            where: { userId, ingredientId: { in: ingredientIds } },
          });

    const totalsByIngredient = new Map<string, number>();
    const rawByIngredient = new Map<string, string[]>();
    for (const row of userRows) {
      const parsed = parseUserQuantityString(row.quantity);
      const add = parsed.value ?? 0;
      totalsByIngredient.set(
        row.ingredientId,
        (totalsByIngredient.get(row.ingredientId) ?? 0) + add,
      );
      const arr = rawByIngredient.get(row.ingredientId) ?? [];
      arr.push(row.quantity);
      rawByIngredient.set(row.ingredientId, arr);
    }

    const items: RecipePantryComparisonItem[] = [];
    let linesWithStock = 0;
    let linesSufficient = 0;

    for (const ri of recipe.recipeIngredients) {
      const ing = ri.ingredients;
      const mu = ing.measureUnits;
      const unitRow = ing.ingredientUnits.find(
        (iu) => iu.measureUnitsId === ing.measureUnitsId,
      );

      const required = new Prisma.Decimal(ri.amount.toString());
      const rowsForIng = userRows.filter((r) => r.ingredientId === ri.ingredientId);
      const hasInPantry = rowsForIng.length > 0;

      let parseError = false;
      for (const r of rowsForIng) {
        if (parseUserQuantityString(r.quantity).parseError) {
          parseError = true;
        }
      }

      const rawList = rawByIngredient.get(ri.ingredientId);
      const userQuantityRaw =
        rawList && rawList.length > 0
          ? rawList.length === 1
            ? rawList[0]
            : rawList.join(' + ')
          : null;

      const userParsed = hasInPantry
        ? (totalsByIngredient.get(ri.ingredientId) ?? 0)
        : null;

      const haveDec =
        userParsed !== null && Number.isFinite(userParsed)
          ? new Prisma.Decimal(userParsed)
          : null;
      const sufficient = haveDec !== null && haveDec.gte(required);
      const shortage = sufficient
        ? new Prisma.Decimal(0)
        : required.minus(haveDec ?? new Prisma.Decimal(0));

      if (hasInPantry) {
        linesWithStock += 1;
      }
      if (sufficient) {
        linesSufficient += 1;
      }

      items.push({
        recipe_ingredient_id: ri.id,
        ingredient_id: ing.id,
        ingredient_name: ing.name,
        measure_units_id: ing.measureUnitsId,
        measure_unit: {
          id: mu.id,
          name: mu.name,
          abbreviation: mu.abbreviation,
        },
        ingredient_unit_id: unitRow?.id ?? null,
        required_amount: required.toString(),
        user_quantity_raw: hasInPantry ? userQuantityRaw : null,
        user_quantity_parsed: hasInPantry ? userParsed : null,
        quantity_parse_error: hasInPantry ? parseError : false,
        has_in_pantry: hasInPantry,
        is_sufficient: sufficient,
        shortage_amount: shortage.toString(),
      });
    }

    return {
      recipe_id: recipe.id,
      title: recipe.title,
      items,
      summary: {
        total_lines: items.length,
        lines_with_stock: linesWithStock,
        lines_sufficient: linesSufficient,
        all_sufficient:
          items.length > 0 && linesSufficient === items.length,
      },
    };
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
