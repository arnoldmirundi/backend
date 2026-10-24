import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { NotFoundError } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity.js';
import { Repository } from 'typeorm';

const GIRLS_AGE_GROUPS = ['U17'];

@Injectable()
export class CategoriesService {
  constructor(@InjectRepository(Category)
  private readonly categoryRepository: Repository<Category>,){}

  private assertValidCombination(section: string, ageGroup:string){
    if (section.toLowerCase() === 'girls' && !GIRLS_AGE_GROUPS.includes(ageGroup)){
      throw new BadRequestException('Girls have u17 only')
    }
  }

  private async assertUnique(section:string, ageGroup:string, excludeId?: number){
  const exists = await this.categoryRepository.findOne({where: {section,ageGroup}});
  if (exists && exists.id !== excludeId) throw new ConflictException('Category exists');
  }


  async create(dto: CreateCategoryDto) {
    this.assertValidCombination(dto.section, dto.ageGroup);
    await this.assertUnique(dto.section, dto.ageGroup);
    const category = this.categoryRepository.create(dto);
    return this.categoryRepository.save(category);
  }

  findAll() {
    return this.categoryRepository.find({order: {section: 'ASC', id:'ASC'}});
  }

  async findOne(id: number) {
    const category = await this.categoryRepository.findOne({where:{id}});
    if(!category) throw new NotFoundException(`Category #${id} not found`);
    return category;
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const category = await this.findOne(id);
    const merged = {...category, ...dto};
    this.assertValidCombination(merged.section, merged.ageGroup);
    await this.assertUnique(merged.section, merged.ageGroup, id);
    this.categoryRepository.merge(category,dto);
    return this.categoryRepository.save(category);
  }

  async remove(id: number) {
    const category = await this.findOne(id);
    return this.categoryRepository.remove(category)
  }
}
