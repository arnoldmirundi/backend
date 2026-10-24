import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';
import { ClubsService } from '../clubs/clubs.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Team } from './entities/team.entity.js';
import { FindOptionsWhere, ILike, IsNull, Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity.js';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    private readonly clubsService: ClubsService,
    private readonly categoriesService: CategoriesService
  ){}

  private normalizeLabel(label?: string){
    return label?.trim();
  }

  private async assertUniqueTeam(clubId:number, categoryId:number, label?: string | null, excludeId?: number){
    const teamExists = await this.teamRepository.findOne({where:{club:{id:clubId},category:{id:categoryId},label:label ? ILike(label): IsNull()}});
    if(teamExists && teamExists.id !== excludeId){
      throw new ConflictException('This team already exists')
    }
  }


  async create(dto: CreateTeamDto) {
    const club = await this.clubsService.findOne(Number(dto.clubId));
    const category = await this.categoriesService.findOne(Number(dto.categoryId));
    const label = this.normalizeLabel(dto.label)
    await this.assertUniqueTeam(club.id, category.id, label);
    const team = this.teamRepository.create({club, category, label});

    return this.teamRepository.save(team);

  }

  findAll(filters: {section?:string; ageGroup?:string}={}) {
    const {section, ageGroup} = filters;
    
    const categoryWhere: FindOptionsWhere<Category>={};
    if(section) categoryWhere.section = ILike(section);
    if (ageGroup) categoryWhere.ageGroup = ILike(ageGroup);

    return this.teamRepository.find({relations:{club: true, category: true},
    where:Object.keys(categoryWhere).length? {category:categoryWhere}: {}, order: {club: {name:'ASC'}}});
  }

  async findOne(id: number) {
    const team = await this.teamRepository.findOne({where:{id}, relations:{club:true,category:true},});
    if(!team) throw new NotFoundException('This team does not exist')
    return team;
  }

  async update(id: number, dto: UpdateTeamDto) {
    const team = await this.findOne(id)
    const club = dto.clubId !== undefined ? await this.clubsService.findOne(Number(dto.clubId)):team.club;
    const category = dto.categoryId !== undefined ? await this.categoriesService.findOne(Number(dto.categoryId)): team.category;
    const label = dto.label !== undefined ? this.normalizeLabel(dto.label): team.label;

    await this.assertUniqueTeam(club.id, category.id, label, id);
    return this.teamRepository.save(team);
  }

  async remove(id: number) {
    const team = await this.findOne(id);
    return this.teamRepository.remove(team);
  }
}
