import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateClubDto } from './dto/create-club.dto.js';
import { UpdateClubDto } from './dto/update-club.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Club } from './entities/club.entity.js';

@Injectable()
export class ClubsService {
  constructor(@InjectRepository(Club)
  private readonly clubRepository: Repository<Club>,
  ){}

  private async assertUniqueClub(name:string, excludeId?: number){
    const exists = await this.clubRepository.findOne({where: {name: ILike(name.trim())},})
    if (exists && exists.id !== excludeId)
      throw new ConflictException('Club exists');
  }


  async create(dto: CreateClubDto) {
  await this.assertUniqueClub(dto.name);
  const club = this.clubRepository.create({...dto, name:dto.name.trim()});
  return this.clubRepository.save(club)
  }

  findAll(filters: {name?: string}={}) {
    const where: FindOptionsWhere<Club>={};
    if (filters.name) where.name = ILike(`%${filters.name.trim()}`);
  return this.clubRepository.find({where, order:{name:'ASC'}});
  }

  async findOne(id: number) {
    const club = await this.clubRepository.findOne({where: {id}});
    if(!club) throw new NotFoundException;
    return club;
  }

  async update(id: number, dto: UpdateClubDto) {
    if (dto.name) await this.assertUniqueClub(dto.name, id);
    const club = await this.clubRepository.preload({id, ...dto, ...(dto.name && {name: dto.name.trim()}),});
    if (!club) throw new NotFoundException;
    return this.clubRepository.save(club)
  }

  async remove(id: number) {
    const club = await this.findOne(id);
    return this.clubRepository.remove(club);

  }
}
