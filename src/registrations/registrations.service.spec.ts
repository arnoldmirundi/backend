import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistrationsService } from './registrations.service.js';
import { PaymentStatus, Registration, RegistrationStatus } from './entities/registration.entity.js';
import { CreateRegistrationDto } from './dto/create-registration.dto.js';
import { Club } from '../clubs/entities/club.entity.js';
import { Category } from '../categories/entities/category.entity.js';
import { Team } from '../teams/entities/team.entity.js';

// ---------- test data ----------

const dto = (overrides: Partial<CreateRegistrationDto> = {}): CreateRegistrationDto => ({
  clubName: 'Test Academy',
  country: 'Uganda',
  contactName: 'Jane Doe',
  contactRole: 'Coach',
  contactEmail: 'jane@example.com',
  contactPhone: '+256 700 000 000',
  entries: [
    { section: 'Boys', ageGroup: 'U12', count: 2 },
    { section: 'Girls', ageGroup: 'U17', count: 1 },
  ],
  ...overrides,
});

const pendingRegistration = (overrides: Partial<Registration> = {}): Partial<Registration> => ({
  id: 1,
  clubName: 'Test Academy',
  country: 'Uganda',
  logo: null,
  kitPrimary: 'Blue',
  kitSecondary: 'White',
  status: RegistrationStatus.Pending,
  paymentStatus: PaymentStatus.Unpaid,
  amountDue: 300,
  paidAt: null,
  entries: [
    { section: 'Boys', ageGroup: 'U12', count: 2 },
    { section: 'Girls', ageGroup: 'U17', count: 1 },
  ],
  ...overrides,
});

// ---------- mocks ----------

const createRegistrationRepository = () => ({
  findOne: vi.fn(),
  find: vi.fn(),
  create: vi.fn((data: Partial<Registration>) => ({ ...data })),
  save: vi.fn(async (data: Partial<Registration>) => ({ id: 1, ...data })),
});

type ManagerState = {
  registration: Partial<Registration> | null;
  existingClub?: Partial<Club> | null;
  existingTeamLabels?: (string | null)[];
};

// Fake EntityManager used inside dataSource.transaction()
const createManager = (state: ManagerState) => {
  let nextId = 100;
  return {
    findOne: vi.fn(async (entity: unknown, options: { where: Record<string, unknown> }) => {
      if (entity === Registration) return state.registration;
      if (entity === Club) return state.existingClub ?? null;
      if (entity === Category) return null; // categories get created
      if (entity === Team) {
        const label = typeof options.where.label === 'string' ? options.where.label : null;
        return state.existingTeamLabels?.includes(label) ? { id: 1, label } : null;
      }
      return null;
    }),
    create: vi.fn((_entity: unknown, data: object) => ({ ...data })),
    save: vi.fn(async (data: { id?: number }) => ({ ...data, id: data.id ?? nextId++ })),
  };
};

// Labels of the teams created through manager.create(Team, ...)
const createdTeamLabels = (manager: ReturnType<typeof createManager>) =>
  manager.create.mock.calls
    .filter(([entity]) => entity === Team)
    .map(([, data]) => (data as { label: string | null }).label);

// ---------- tests ----------

describe('RegistrationsService', () => {
  let service: RegistrationsService;
  let registrationRepository: ReturnType<typeof createRegistrationRepository>;
  let manager: ReturnType<typeof createManager>;

  beforeEach(async () => {
    registrationRepository = createRegistrationRepository();
    manager = createManager({ registration: null });

    const module = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        { provide: getRepositoryToken(Registration), useValue: registrationRepository },
        {
          provide: DataSource,
          useValue: { transaction: vi.fn(async (work: (m: unknown) => unknown) => work(manager)) },
        },
      ],
    }).compile();

    service = module.get(RegistrationsService);
  });

  describe('create', () => {
    it('charges $100 per team for clubs outside Rwanda and leaves them pending', async () => {
      registrationRepository.findOne.mockResolvedValue(null);
      const approve = vi.spyOn(service, 'approve');

      const result = await service.create(dto({ country: 'Uganda' }));

      expect(registrationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          clubName: 'Test Academy',
          paymentStatus: PaymentStatus.Unpaid,
          amountDue: 300, // 2 + 1 teams
        }),
      );
      expect(approve).not.toHaveBeenCalled();
      expect(result.status ?? RegistrationStatus.Pending).toBe(RegistrationStatus.Pending);
    });

    it('approves Rwandan clubs immediately at no cost', async () => {
      registrationRepository.findOne.mockResolvedValue(null);
      const approve = vi
        .spyOn(service, 'approve')
        .mockResolvedValue({ id: 1, status: RegistrationStatus.Approved } as Registration);

      const result = await service.create(dto({ country: ' rwanda ' }));

      expect(registrationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ paymentStatus: PaymentStatus.NotRequired, amountDue: 0 }),
      );
      expect(approve).toHaveBeenCalledWith(1);
      expect(result.status).toBe(RegistrationStatus.Approved);
    });

    it('rejects girls teams outside U17', async () => {
      await expect(
        service.create(dto({ entries: [{ section: 'Girls', ageGroup: 'U12', count: 1 }] })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects the same category listed twice', async () => {
      await expect(
        service.create(
          dto({
            entries: [
              { section: 'Boys', ageGroup: 'U12', count: 1 },
              { section: 'Boys', ageGroup: 'U12', count: 2 },
            ],
          }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a club that has already registered', async () => {
      registrationRepository.findOne.mockResolvedValue({ id: 7, clubName: 'Test Academy' });

      await expect(service.create(dto())).rejects.toBeInstanceOf(ConflictException);
      expect(registrationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    it('throws NotFound for an unknown registration', async () => {
      manager = createManager({ registration: null });
      await expect(service.approve(99)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to approve twice', async () => {
      manager = createManager({
        registration: pendingRegistration({ status: RegistrationStatus.Approved }),
      });
      await expect(service.approve(1)).rejects.toBeInstanceOf(ConflictException);
    });

    it('marks payment, creates the club and labels multiple teams A, B', async () => {
      manager = createManager({ registration: pendingRegistration() });

      const result = await service.approve(1);

      expect(result.status).toBe(RegistrationStatus.Approved);
      expect(result.paymentStatus).toBe(PaymentStatus.Paid);
      expect(result.paidAt).toBeInstanceOf(Date);
      expect(result.clubId).toEqual(expect.any(Number));

      expect(manager.create).toHaveBeenCalledWith(
        Club,
        expect.objectContaining({ name: 'Test Academy', country: 'Uganda', kitPrimary: 'Blue' }),
      );
      // Boys U12 × 2 → A, B ; Girls U17 × 1 → no label
      expect(createdTeamLabels(manager)).toEqual(['A', 'B', null]);
    });

    it('reuses an existing club and skips teams that already exist', async () => {
      manager = createManager({
        registration: pendingRegistration(),
        existingClub: { id: 5, name: 'Test Academy' },
        existingTeamLabels: ['A'],
      });

      const result = await service.approve(1);

      expect(manager.create).not.toHaveBeenCalledWith(Club, expect.anything());
      expect(result.clubId).toBe(5);
      expect(createdTeamLabels(manager)).toEqual(['B', null]);
    });

    it('does not change payment for fee-exempt registrations', async () => {
      manager = createManager({
        registration: pendingRegistration({
          country: 'Rwanda',
          paymentStatus: PaymentStatus.NotRequired,
          amountDue: 0,
        }),
      });

      const result = await service.approve(1);

      expect(result.paymentStatus).toBe(PaymentStatus.NotRequired);
      expect(result.paidAt).toBeNull();
    });
  });

  describe('reject', () => {
    it('rejects a pending registration', async () => {
      registrationRepository.findOne.mockResolvedValue(pendingRegistration());

      const result = await service.reject(1);

      expect(result.status).toBe(RegistrationStatus.Rejected);
      expect(result.reviewedAt).toBeInstanceOf(Date);
    });

    it('cannot reject a registration that is already approved', async () => {
      registrationRepository.findOne.mockResolvedValue(
        pendingRegistration({ status: RegistrationStatus.Approved }),
      );
      await expect(service.reject(1)).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws NotFound for an unknown registration', async () => {
      registrationRepository.findOne.mockResolvedValue(null);
      await expect(service.reject(99)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});