import { Module } from '@nestjs/common';
import { MeasureTypesService } from './measure-types.service';
import { MeasureTypesController } from './measure-types.controller';

@Module({
  controllers: [MeasureTypesController],
  providers: [MeasureTypesService],
  exports: [MeasureTypesService],
})
export class MeasureTypesModule {}
