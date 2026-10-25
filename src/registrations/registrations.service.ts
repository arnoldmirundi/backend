import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, In, IsNull, Repository } from 'typeorm';
import { PaymentStatus, Registration, RegistrationStatus } from './entities/registration.entity.js';
import { CreateRegistrationDto } from './dto/create-registration.dto.js';
import { RegistrationMailer } from './registration-mailer.js';
import { Club } from '../clubs/entities/club.entity.js';
import { Category } from '../categories/entities/category.entity.js';
import { Team } from '../teams/entities/team.entity.js';

const TEAM_FEE = 150;
const FEE_EXEMPT_COUNTRY = 'rwanda';

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    private readonly dataSource: DataSource,
    private readonly mailer: RegistrationMailer,
  ) {}

  // ---------- helpers ----------

  private validateEntries(entries: CreateRegistrationDto['entries']) {
    const seen = new Set<string>();
    for (const e of entries) {
      if (e.section === 'Girls' && e.ageGroup !== 'U17') {
        throw new BadRequestException('Girls only have U17');
      }
      const key = `${e.section}|${e.ageGroup}`;
      if (seen.has(key)) {
        throw new BadRequestException(`${e.section} ${e.ageGroup} is listed twice`);
      }
      seen.add(key);
    }
  }

  private async assertNotAlreadyRegistered(clubName: string) {
    const existing = await this.registrationRepository.findOne({
      where: {
        clubName: ILike(clubName),
        status: In([RegistrationStatus.Pending, RegistrationStatus.Approved]),
      },
    });
    if (existing) {
      throw new ConflictException(`${clubName} has already registered`);
    }
  }

  // Send in the background: a failed email must never undo a registration or approval
  private notify(registration: Registration, send: (r: Registration) => Promise<void>) {
    send(registration).catch((err: Error) =>
      this.logger.error(`Email for registration #${registration.id} failed: ${err.message}`),
    );
  }

  // ---------- public API ----------

  async create(dto: CreateRegistrationDto) {
    const clubName = dto.clubName.trim();
    this.validateEntries(dto.entries);
    await this.assertNotAlreadyRegistered(clubName);

    const exempt = dto.country.trim().toLowerCase() === FEE_EXEMPT_COUNTRY;
    const teamCount = dto.entries.reduce((sum, e) => sum + e.count, 0);

    const registration = await this.registrationRepository.save(
      this.registrationRepository.create({
        ...dto,
        clubName,
        logo: dto.logo ?? null,
        kitPrimary: dto.kitPrimary ?? null,
        kitSecondary: dto.kitSecondary ?? null,
        notes: dto.notes ?? null,
        paymentStatus: exempt ? PaymentStatus.NotRequired : PaymentStatus.Unpaid,
        amountDue: exempt ? 0 : teamCount * TEAM_FEE,
      }),
    );

    // Rwandan clubs are approved immediately (approve() sends the confirmation email)
    if (exempt) return this.approve(registration.id);

    this.notify(registration, (r) => this.mailer.received(r));
    return registration;
  }

  findAll(status?: RegistrationStatus) {
    return this.registrationRepository.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const registration = await this.registrationRepository.findOne({ where: { id } });
    if (!registration) throw new NotFoundException(`Registration #${id} not found`);
    return registration;
  }

  async reject(id: number, reason?: string) {
    const registration = await this.findOne(id);
    if (registration.status !== RegistrationStatus.Pending) {
      throw new ConflictException(`Registration is already ${registration.status}`);
    }
    registration.status = RegistrationStatus.Rejected;
    registration.rejectionReason = reason?.trim() || null;
    registration.reviewedAt = new Date();

    const saved = await this.registrationRepository.save(registration);
    this.notify(saved, (r) => this.mailer.rejected(r));
    return saved;
  }

  // Creates the club, any missing categories and the teams in one transaction,
  // then emails the club once everything is saved
  async approve(id: number) {
    const registration = await this.dataSource.transaction(async (manager) => {
      const registration = await manager.findOne(Registration, { where: { id } });
      if (!registration) throw new NotFoundException(`Registration #${id} not found`);
      if (registration.status !== RegistrationStatus.Pending) {
        throw new ConflictException(`Registration is already ${registration.status}`);
      }

      if (registration.paymentStatus === PaymentStatus.Unpaid) {
        registration.paymentStatus = PaymentStatus.Paid;
        registration.paidAt = new Date();
      }

      let club = await manager.findOne(Club, { where: { name: ILike(registration.clubName) } });
      if (!club) {
        club = await manager.save(
          manager.create(Club, {
            name: registration.clubName,
            country: registration.country,
            logo: registration.logo,
            kitPrimary: registration.kitPrimary,
            kitSecondary: registration.kitSecondary,
          }),
        );
      }

      for (const entry of registration.entries) {
        let category = await manager.findOne(Category, {
          where: { section: entry.section, ageGroup: entry.ageGroup },
        });
        if (!category) {
          category = await manager.save(
            manager.create(Category, { section: entry.section, ageGroup: entry.ageGroup }),
          );
        }

        // 1 team → no label; 2+ teams → A, B, C...
        const labels: (string | null)[] =
          entry.count > 1
            ? Array.from({ length: entry.count }, (_, i) => String.fromCharCode(65 + i))
            : [null];

        for (const label of labels) {
          const exists = await manager.findOne(Team, {
            where: { club: { id: club.id }, category: { id: category.id }, label: label ?? IsNull() },
          });
          if (!exists) {
            await manager.save(manager.create(Team, { club, category, label }));
          }
        }
      }

      registration.status = RegistrationStatus.Approved;
      registration.reviewedAt = new Date();
      registration.clubId = club.id;
      return manager.save(registration);
    });

    this.notify(registration, (r) => this.mailer.approved(r));
    return registration;
  }

  // Admin: send the email for the current status again
  async resendEmail(id: number) {
    const registration = await this.findOne(id);
    const send = {
      [RegistrationStatus.Pending]: () => this.mailer.received(registration),
      [RegistrationStatus.Approved]: () => this.mailer.approved(registration),
      [RegistrationStatus.Rejected]: () => this.mailer.rejected(registration),
    }[registration.status];

    try {
      await send();
    } catch (err) {
      this.logger.error(`Resend for registration #${id} failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('The email could not be sent. Check the mail settings.');
    }
    return { sent: true, to: registration.contactEmail };
  }
}