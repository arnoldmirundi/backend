import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamsService } from './teams.service.js';
import { Team } from './entities/team.entity.js';
import { ClubsService } from '../clubs/clubs.service.js';
import { CategoriesService } from '../categories/categories.service.js';

const club = { id: 1, name: 'Ajente SA' };
const category = { id: 2, section: 'Boys', ageGroup: 'U12' };

const createTeamRepository = () => ({
  findOne: vi.fn(),
  find: vi.fn(),
  create: vi.fn((data: object) => ({ ...data })),
  save: vi.fn(async (data: object) => ({ id: 1, ...data })),
  merge: vi.fn((target: object, source: object) => Object.assign(target, source)),
  remove: vi.fn(async (data: object) => data),
});

describe('TeamsService', () => {
  let service: TeamsService;
  let teamRepository: ReturnType<typeof createTeamRepository>;
  let clubsService: { findOne: ReturnType<typeof vi.fn> };
  let categoriesService: { findOne: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    teamRepository = createTeamRepository();
    clubsService = { findOne: vi.fn().mockResolvedValue(club) };
    categoriesService = { findOne: vi.fn().mockResolvedValue(category) };

    const module = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: getRepositoryToken(Team), useValue: teamRepository },
        { provide: ClubsService, useValue: clubsService },
        { provide: CategoriesService, useValue: categoriesService },
      ],
    }).compile();

    service = module.get(TeamsService);
  });

  describe('findOne', () => {
    it('returns the team', async () => {
      const team = { id: 1, club, category, label: null };
      teamRepository.findOne.mockResolvedValue(team);

      expect(await service.findOne(1)).toEqual(team);
    });

    it('throws NotFound when the team does not exist', async () => {
      teamRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a team with a trimmed label', async () => {
      teamRepository.findOne.mockResolvedValue(null);

      await service.create({ clubId: 1, categoryId: 2, label: '  A ' });

      expect(teamRepository.create).toHaveBeenCalledWith({ club, category, label: 'A' });
      expect(teamRepository.save).toHaveBeenCalled();
    });

    it('stores an empty label as null', async () => {
      teamRepository.findOne.mockResolvedValue(null);

      await service.create({ clubId: 1, categoryId: 2, label: '   ' });

      expect(teamRepository.create).toHaveBeenCalledWith({ club, category, label: null });
    });

    it('rejects a duplicate team', async () => {
      teamRepository.findOne.mockResolvedValue({ id: 5 });

      await expect(service.create({ clubId: 1, categoryId: 2 })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(teamRepository.save).not.toHaveBeenCalled();
    });

    it('passes on NotFound for an unknown club', async () => {
      clubsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create({ clubId: 99, categoryId: 2 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('does not conflict with itself', async () => {
      const team = { id: 1, club, category, label: 'A' };
      teamRepository.findOne
        .mockResolvedValueOnce(team) // findOne(id)
        .mockResolvedValueOnce({ id: 1 }); // uniqueness check finds the same team

      await service.update(1, { label: 'A' });

      expect(teamRepository.save).toHaveBeenCalled();
    });

    it('rejects a label already used by another team', async () => {
      teamRepository.findOne
        .mockResolvedValueOnce({ id: 1, club, category, label: 'A' })
        .mockResolvedValueOnce({ id: 2 }); // a different team has label B

      await expect(service.update(1, { label: 'B' })).rejects.toBeInstanceOf(ConflictException);
      expect(teamRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes an existing team', async () => {
      const team = { id: 1, club, category, label: null };
      teamRepository.findOne.mockResolvedValue(team);

      await service.remove(1);

      expect(teamRepository.remove).toHaveBeenCalledWith(team);
    });
  });
});