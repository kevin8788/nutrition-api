import { Injectable } from '@nestjs/common';
import { Prisma, settings, user_profile } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findProfile(userId: bigint): Promise<user_profile | null> {
    return this.prisma.user_profile.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async upsertProfile(
    userId: bigint,
    data: Prisma.user_profileUncheckedUpdateInput,
  ): Promise<user_profile> {
    const existing = await this.findProfile(userId);
    if (existing) {
      return this.prisma.user_profile.update({
        where: { id: existing.id },
        data: { ...data, updated_at: new Date() },
      });
    }
    return this.prisma.user_profile.create({
      data: { ...data, user_id: userId } as Prisma.user_profileUncheckedCreateInput,
    });
  }

  async findSettings(userId: bigint): Promise<settings | null> {
    return this.prisma.settings.findFirst({ where: { user_id: userId } });
  }

  async upsertSettingsUnits(
    userId: bigint,
    units: { weight_unit: string; height_unit: string; distance_unit: string },
  ): Promise<settings> {
    const existing = await this.findSettings(userId);
    if (existing) {
      return this.prisma.settings.update({
        where: { id_user_id: { id: existing.id, user_id: existing.user_id } },
        data: { ...units, updated_at: new Date().toISOString() },
      });
    }
    return this.prisma.settings.create({ data: { user_id: userId, ...units } });
  }

  async updateGender(userId: bigint, gender: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { gender } });
  }

  async findUserGender(userId: bigint): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true },
    });
    return user?.gender ?? null;
  }
}
