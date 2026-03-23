import { Module } from '@nestjs/common';
import { IngredientUnitsService } from './ingredient-units.service';
import { IngredientUnitsController } from './ingredient-units.controller';

@Module({
  controllers: [IngredientUnitsController],
  providers: [IngredientUnitsService],
  exports: [IngredientUnitsService],
})
export class IngredientUnitsModule {}
