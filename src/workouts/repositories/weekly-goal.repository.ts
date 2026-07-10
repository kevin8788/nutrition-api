import { Injectable } from '@nestjs/common';
import { weekly_goal } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface WeeklyGoalTargets {
  workouts_target?: number;
  minutes_target?: number;
  distance_target_km?: number;
}

@Injectable()
export class WeeklyGoalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(userId: bigint): Promise<weekly_goal | null> {
    return this.prisma.weekly_goal.findUnique({ where: { user_id: userId } });
  }

  async upsertForUser(userId: bigint, targets: WeeklyGoalTargets): Promise<weekly_goal> {
    return this.prisma.weekly_goal.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...targets },
      update: { ...targets, updated_at: new Date() },
    });
  }
}
