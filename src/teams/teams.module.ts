import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service.js';
import { TeamsController } from './teams.controller.js';
import { ClubsModule } from '../clubs/clubs.module.js';
import { CategoriesModule } from '../categories/categories.module.js';
import {TypeOrmModule} from '@nestjs/typeorm';
import { Team } from './entities/team.entity.js';

@Module({
  imports:[TypeOrmModule.forFeature([Team]),ClubsModule,CategoriesModule],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}
