import { Injectable } from '@nestjs/common';
import { user_profile } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type UserProfileWrite = Pick<
  user_profile,
  | 'weight'
  | 'height'
  | 'activity_level'
  | 'daily_walking_minutes'
  | 'has_run_before'
  | 'days_per_week'
  | 'preferred_location'
  | 'goal_type'
  | 'intensity_preference'
>;

@Injectable()
export class UserProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: bigint): Promise<user_profile | null> {
    return this.prisma.user_profile.findFirst({ where: { user_id: userId } });
  }

  // user_id has no unique constraint, so Prisma's native upsert cannot
  // target it; emulate with findFirst + update/create.
  async upsertForUser(userId: bigint, data: UserProfileWrite): Promise<user_profile> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      return this.prisma.user_profile.update({
        where: { id: existing.id },
        data: { ...data, updated_at: new Date() },
      });
    }

    return this.prisma.user_profile.create({
      data: { user_id: userId, ...data },
    });
  }
}
