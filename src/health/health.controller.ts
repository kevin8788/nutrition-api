import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: string; timestamp: string; db: string }> {
    let db = 'disconnected';
    try {
      await this.prisma.$queryRaw`SELECT 1`; 
      
      let r = await this.prisma.user.findMany(); 
      db = 'connected';
    } catch (error) {
      db = `error: ${(error as Error).message}`;
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      db,
    };
  }
}
