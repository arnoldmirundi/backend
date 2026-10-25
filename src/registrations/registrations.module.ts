import { Module } from '@nestjs/common';
import { RegistrationsService } from './registrations.service.js';
import { RegistrationsController } from './registrations.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Registration } from './entities/registration.entity.js';
import { MailModule } from '../mail/mail.module.js';
import { RegistrationMailer } from './registration-mailer.js';


@Module({
  imports:[TypeOrmModule.forFeature([Registration]), MailModule],
  controllers: [RegistrationsController],
  providers: [RegistrationsService, RegistrationMailer],
})
export class RegistrationsModule {}
