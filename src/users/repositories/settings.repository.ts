import { Injectable } from '@nestjs/common';
import { settings } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from '../dto/update-settings.dto';

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: bigint): Promise<settings | null> {
    return this.prisma.settings.findFirst({ where: { user_id: userId } });
  }

  async upsert(userId: bigint, data: UpdateSettingsDto): Promise<settings> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      return this.prisma.settings.update({
        where: { id_user_id: { id: existing.id, user_id: userId } },
        data: { ...data, updated_at: new Date().toISOString() },
      });
    }

    return this.prisma.settings.create({
      data: { user_id: userId, ...data, updated_at: new Date().toISOString() },
    });
  }
}
