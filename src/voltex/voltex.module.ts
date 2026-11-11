import { Module } from '@nestjs/common';
import { VoltexController } from './voltex.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [VoltexController],
  providers: [PrismaService],
})
export class VoltexModule {}