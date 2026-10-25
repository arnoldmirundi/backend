import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationsController } from './registrations.controller.js';
import { RegistrationsService } from './registrations.service.js';
describe('RegistrationsController', () => {
  let controller: RegistrationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistrationsController],
      providers: [RegistrationsService],
    }).compile();

    controller = module.get<RegistrationsController>(RegistrationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
