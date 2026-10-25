import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it } from 'vitest';
import { ClubsService } from './clubs.service.js';
import { Club } from './entities/club.entity.js';

describe('ClubsService', () => {
  let service: ClubsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ClubsService, { provide: getRepositoryToken(Club), useValue: {} }],
    }).compile();

    service = module.get(ClubsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});