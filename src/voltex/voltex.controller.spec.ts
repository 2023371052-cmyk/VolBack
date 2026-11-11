import { Test, TestingModule } from '@nestjs/testing';
import { VoltexController } from './voltex.controller';

describe('VoltexController', () => {
  let controller: VoltexController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoltexController],
    }).compile();

    controller = module.get<VoltexController>(VoltexController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
