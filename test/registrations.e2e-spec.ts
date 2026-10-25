import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

const TEST_DB = 'iteen_test';
const API_KEY = 'test-admin-key';

// Read by AppModule's useFactory and by ApiKeyGuard at runtime,
// so they override the values from .env
process.env.DATABASE_NAME = TEST_DB;
process.env.ADMIN_API_KEY = API_KEY;

type TeamBody = { label: string | null; club: { name: string } };

const registration = (overrides: Record<string, unknown> = {}) => ({
  clubName: 'Kigali Stars',
  country: 'Rwanda',
  contactName: 'Jane Doe',
  contactRole: 'Coach',
  contactEmail: 'jane@example.com',
  contactPhone: '+250 788 123 456',
  kitPrimary: 'Blue',
  entries: [{ section: 'Boys', ageGroup: 'U12', count: 2 }],
  ...overrides,
});

describe('Registrations (e2e)', () => {
  let app: INestApplication;
  let ugandaId: number;

  const http = () => request(app.getHttpServer());
  const teamsOf = (teams: TeamBody[], clubName: string) =>
    teams.filter((t) => t.club.name === clubName);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    // Same settings as main.ts
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    // Safety net: never wipe the real database
    const dataSource = app.get(DataSource);
    const database = (dataSource.options as { database?: unknown }).database;
    if (database !== TEST_DB) {
      throw new Error(`Refusing to run e2e tests against database "${String(database)}"`);
    }
    await dataSource.synchronize(true); // drop + recreate all tables
  });

  afterAll(async () => {
    await app?.close();
  });

  it('confirms a Rwandan club immediately', async () => {
    const res = await http().post('/registrations').send(registration()).expect(201);

    expect(res.body).toMatchObject({
      status: 'approved',
      paymentStatus: 'not_required',
      amountDue: 0,
    });
    expect(res.body.clubId).toEqual(expect.any(Number));
  });

  it('creates teams A and B for the confirmed club', async () => {
    const res = await http()
      .get('/teams')
      .query({ section: 'Boys', ageGroup: 'U12' })
      .expect(200);

    const labels = teamsOf(res.body, 'Kigali Stars').map((t) => t.label).sort();
    expect(labels).toEqual(['A', 'B']);
  });

  it('rejects a second registration for the same club (any casing)', async () => {
    await http()
      .post('/registrations')
      .send(registration({ clubName: 'kigali stars' }))
      .expect(409);
  });

  it('rejects girls teams outside U17', async () => {
    await http()
      .post('/registrations')
      .send(
        registration({
          clubName: 'Girls FC',
          entries: [{ section: 'Girls', ageGroup: 'U12', count: 1 }],
        }),
      )
      .expect(400);
  });

  it('rejects unknown fields', async () => {
    await http()
      .post('/registrations')
      .send({ ...registration({ clubName: 'Extra FC' }), isAdmin: true })
      .expect(400);
  });

  it('keeps a foreign club pending until it pays $100 per team', async () => {
    const res = await http()
      .post('/registrations')
      .send(
        registration({
          clubName: 'Kampala United',
          country: 'Uganda',
          entries: [
            { section: 'Boys', ageGroup: 'U12', count: 2 },
            { section: 'Boys', ageGroup: 'U15', count: 1 },
          ],
        }),
      )
      .expect(201);

    expect(res.body).toMatchObject({ status: 'pending', paymentStatus: 'unpaid', amountDue: 300 });
    ugandaId = res.body.id;

    const teams = await http().get('/teams').expect(200);
    expect(teamsOf(teams.body, 'Kampala United')).toHaveLength(0);
  });

  it('protects admin routes with the API key', async () => {
    await http().get('/registrations').expect(401);
    await http().get('/registrations').set('x-api-key', 'wrong').expect(401);

    const res = await http().get('/registrations').set('x-api-key', API_KEY).expect(200);
    expect(res.body).toHaveLength(2);
  });

  it('approves a paid registration and creates its teams', async () => {
    const res = await http()
      .patch(`/registrations/${ugandaId}/approve`)
      .set('x-api-key', API_KEY)
      .expect(200);

    expect(res.body).toMatchObject({ status: 'approved', paymentStatus: 'paid' });
    expect(res.body.paidAt).toBeTruthy();

    const teams = await http().get('/teams').expect(200);
    expect(teamsOf(teams.body, 'Kampala United')).toHaveLength(3);
  });

  it('cannot approve the same registration twice', async () => {
    await http()
      .patch(`/registrations/${ugandaId}/approve`)
      .set('x-api-key', API_KEY)
      .expect(409);
  });

  it('returns 404 for an unknown registration', async () => {
    await http().patch('/registrations/9999/reject').set('x-api-key', API_KEY).expect(404);
  });
});