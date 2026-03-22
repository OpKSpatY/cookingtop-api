import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MeasureTypesModule } from './measure-types/measure-types.module';
import { MeasureUnitsModule } from './measure-units/measure-units.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({ isGlobal: true }),
    UsersModule,
    AuthModule,
    MeasureTypesModule,
    MeasureUnitsModule,
    IngredientsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
