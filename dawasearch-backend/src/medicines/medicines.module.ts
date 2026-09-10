import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Medicine } from './entities/medicine.entity';
import { Offer } from './entities/offer.entity';
import { Pharmacy } from './entities/pharmacy.entity';
import { MedicinesController } from './medicines.controller';
import { MedicinesService } from './medicines.service';

@Module({
  imports: [TypeOrmModule.forFeature([Medicine, Offer, Pharmacy])],
  controllers: [MedicinesController],
  providers: [MedicinesService],
})
export class MedicinesModule {}
