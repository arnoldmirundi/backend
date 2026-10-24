import { Module } from '@nestjs/common';
import { ClubsService } from './clubs.service.js';
import { ClubsController } from './clubs.controller.js';
import { Club } from './entities/club.entity.js';
import {TypeOrmModule} from '@nestjs/typeorm'

@Module({
  imports:[TypeOrmModule.forFeature([Club])],
  controllers: [ClubsController],
  providers: [ClubsService],
  exports: [ClubsService],
})
export class ClubsModule {}
