import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { envValidationSchema } from './config/env.validation.js';
import { ApiKeyGuard } from './guards/api-key/api-key.guard.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ClubsModule } from './clubs/clubs.module.js';
import { TeamsModule } from './teams/teams.module.js';
import { RegistrationsModule } from './registrations/registrations.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]), // 120 requests/min per IP
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL, // used when set; otherwise the parts below
        host: process.env.DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false,
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    CategoriesModule,
    ClubsModule,
    TeamsModule,
    RegistrationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Order matters: rate-limit first, then check the API key
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: ApiKeyGuard },
  ],
})
export class AppModule {}