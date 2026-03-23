import { Module } from '@nestjs/common';
import { UserIngredientsService } from './user-ingredients.service';
import { UserIngredientsController } from './user-ingredients.controller';

@Module({
  controllers: [UserIngredientsController],
  providers: [UserIngredientsService],
  exports: [UserIngredientsService],
})
export class UserIngredientsModule {}
