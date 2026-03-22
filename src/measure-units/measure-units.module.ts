import { Module } from '@nestjs/common';
import { MeasureUnitsService } from './measure-units.service';
import { MeasureUnitsController } from './measure-units.controller';

@Module({
  controllers: [MeasureUnitsController],
  providers: [MeasureUnitsService],
  exports: [MeasureUnitsService],
})
export class MeasureUnitsModule {}
