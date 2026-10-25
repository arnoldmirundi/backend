import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, ParseEnumPipe, Query } from '@nestjs/common';
import { RegistrationsService } from './registrations.service.js';
import { CreateRegistrationDto } from './dto/create-registration.dto.js';
import { RegistrationStatus } from './entities/registration.entity.js';
import { RejectRegistrationDto } from './dto/reject-registration.dto.js';
import { Public } from '../guards/api-key/public.decorator.js';
import {Throttle} from '@nestjs/throttler';

@Controller('registrations')
@Throttle({default: { limit: 5, ttl: 60 * 60 * 1000 }})
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Public()
  
  @Post()
  create(@Body() dto: CreateRegistrationDto) {
    return this.registrationsService.create(dto);
  }

  @Get()
  findAll(@Query('status', new ParseEnumPipe(RegistrationStatus, { optional: true }))
    status?: RegistrationStatus) {
    return this.registrationsService.findAll(status);
  }


  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id:number ) {
    return this.registrationsService.findOne(id);
  }


  @Patch(':id/approve')
  confirmPayment(@Param('id', ParseIntPipe) id: number) {
    return this.registrationsService.approve(id);
  }

  @Patch(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: RejectRegistrationDto) {
    return this.registrationsService.reject(id, dto.reason);
}

  @Post(':id/resend-email')
  resendEmail(@Param('id', ParseIntPipe) id: number) {
    return this.registrationsService.resendEmail(id);
}
}
