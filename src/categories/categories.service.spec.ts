import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it } from 'vitest';
import { CategoriesService } from './categories.service.js';
import { Category } from './entities/category.entity.js';

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CategoriesService, { provide: getRepositoryToken(Category), useValue: {} }],
    }).compile();

    service = module.get(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});