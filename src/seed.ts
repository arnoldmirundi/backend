import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AppModule } from './app.module.js';
import { Club } from './clubs/entities/club.entity.js';
import { Category } from './categories/entities/category.entity.js';
import { Team } from './teams/entities/team.entity.js';

const BOYS = 'Boys';
const GIRLS = 'Girls';

const BOYS_AGE_GROUPS = ['U6', 'U8', 'U10', 'U12', 'U15', 'U17'];

type SeedTeam = { club: string; section: string; ageGroup: string; label?: string };

const boys = (club: string, ageGroups: string[]): SeedTeam[] =>
  ageGroups.map((ageGroup) => ({ club, section: BOYS, ageGroup }));

const girlsU17 = (club: string, label?: string): SeedTeam => ({
  club,
  section: GIRLS,
  ageGroup: 'U17',
  label,
});

const TEAMS: SeedTeam[] = [
  // ---- Boys, sheet 1 ----
  ...boys('Ajente SA', ['U8', 'U10', 'U12', 'U15']),
  { club: 'APR', section: BOYS, ageGroup: 'U17', label: 'Junior' }, // "APR Junior"
  ...boys('Bayern FC RWD', ['U17']),
  ...boys('Bremen SP', ['U8', 'U10', 'U12']),
  ...boys('Brentford SA', ['U6', 'U8', 'U10', 'U12', 'U15']),
  ...boys('Debes FA', ['U6', 'U8', 'U10', 'U12', 'U15', 'U17']),
  ...boys('Future Team', ['U8', 'U10', 'U12', 'U15', 'U17']),
  ...boys('Guud Times SA', ['U10']),
  ...boys('Imena FA', ['U10', 'U12', 'U15']),
  ...boys('Infinity SA', ['U8', 'U12', 'U15']),
  ...boys('Iteen SA RWD', ['U12', 'U15']),
  ...boys('Iteen SA UG', ['U6', 'U8', 'U10', 'U12']),
  ...boys('Kare SA', ['U12', 'U15']),
  ...boys('Better Future FA', ['U10', 'U12']),

  // ---- Boys, sheet 2 ----
  ...boys('Kigezi SA', ['U10', 'U12', 'U15']),
  ...boys('Lead IS', ['U10', 'U17']),
  ...boys('Muvandimwe 12FA', ['U8', 'U12', 'U15', 'U17']),
  ...boys('Native K A', ['U10', 'U12', 'U15', 'U17']),
  ...boys('Omega SA', ['U10', 'U12', 'U15', 'U17']),
  ...boys('Real Moon A', ['U8', 'U10', 'U15', 'U17']),
  ...boys('Runners Up SA', ['U8', 'U10', 'U12', 'U15', 'U17']),
  ...boys('Rwahi FA', ['U15', 'U17']),
  ...boys('Saved Athleticos SA', ['U12', 'U17']),
  ...boys('New Harvest FA', ['U8', 'U10']),
  ...boys('The Lions SA', ['U12']),
  { club: 'The Lions SA', section: BOYS, ageGroup: 'U15', label: 'A' },
  { club: 'The Lions SA', section: BOYS, ageGroup: 'U15', label: 'B' },
  ...boys('True Talents A I FA', ['U12', 'U15', 'U17']),
  ...boys('Wonder SA', ['U6', 'U10', 'U12', 'U15']),

  ...boys('Game Time SA', ['U10', 'U12', 'U17']),
  ...boys('Vikings FA', ['U15']),

  // ---- Girls U17 ----
  girlsU17('Future Team'),
  girlsU17('Runners Up SA', 'Queens'), // "Runners Up Queens"
  girlsU17('Native K A', 'A'),
  girlsU17('Native K A', 'B'),
  girlsU17('Guud Times SA'),
  girlsU17('APR'),
  girlsU17('New Harvest FA'),
];

// Clubs on the sheets whose boxes are all empty: created, but with no teams yet.
const CLUBS_WITHOUT_TEAMS = ['Isibo FA', 'Prime SA', 'Soccerstarts FA'];

const CATEGORIES = [
  ...BOYS_AGE_GROUPS.map((ageGroup) => ({ section: BOYS, ageGroup })),
  { section: GIRLS, ageGroup: 'U17' },
];

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const clubRepository = app.get<Repository<Club>>(getRepositoryToken(Club));
  const categoryRepository = app.get<Repository<Category>>(getRepositoryToken(Category));
  const teamRepository = app.get<Repository<Team>>(getRepositoryToken(Team));

  // Clubs
  const clubs = new Map<string, Club>();
  const clubNames = new Set([...TEAMS.map((t) => t.club), ...CLUBS_WITHOUT_TEAMS]);
  for (const name of clubNames) {
    let club = await clubRepository.findOne({ where: { name } });
    if (!club) club = await clubRepository.save(clubRepository.create({ name }));
    clubs.set(name, club);
  }

  // Categories
  const categories = new Map<string, Category>();
  for (const { section, ageGroup } of CATEGORIES) {
    let category = await categoryRepository.findOne({ where: { section, ageGroup } });
    if (!category) {
      category = await categoryRepository.save(categoryRepository.create({ section, ageGroup }));
    }
    categories.set(`${section}|${ageGroup}`, category);
  }

  // Teams
  let created = 0;
  let skipped = 0;
  for (const t of TEAMS) {
    const club = clubs.get(t.club)!;
    const category = categories.get(`${t.section}|${t.ageGroup}`)!;
    const label = t.label ?? null;

    const exists = await teamRepository.findOne({
      where: {
        club: { id: club.id },
        category: { id: category.id },
        label: label ?? IsNull(),
      },
    });
    if (exists) {
      skipped++;
      continue;
    }

    await teamRepository.save(teamRepository.create({ club, category, label }));
    created++;
  }

  console.log(
    `Clubs: ${clubs.size} | Categories: ${categories.size} | Teams created: ${created}, skipped: ${skipped}`,
  );

  await app.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});