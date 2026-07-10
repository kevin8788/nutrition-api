import { Injectable } from '@nestjs/common';
import { planned_workout } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface CreatePlannedWorkoutData {
  user_id: bigint;
  title: string;
  description: string | null;
  workout_type: string;
  scheduled_date: Date;
  duration_minutes: number;
  intensity: string | null;
  warmup_seconds: number | null;
}

@Injectable()
export class PlannedWorkoutRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePlannedWorkoutData): Promise<planned_workout> {
    return this.prisma.planned_workout.create({ data });
  }

  async findByIdForUser(id: bigint, userId: bigint): Promise<planned_workout | null> {
    return this.prisma.planned_workout.findFirst({ where: { id, user_id: userId } });
  }

  async findForDate(userId: bigint, date: Date): Promise<planned_workout | null> {
    return this.prisma.planned_workout.findFirst({
      where: { user_id: userId, scheduled_date: date },
      orderBy: { created_at: 'asc' },
    });
  }

  async findBetween(userId: bigint, start: Date, end: Date): Promise<planned_workout[]> {
    return this.prisma.planned_workout.findMany({
      where: { user_id: userId, scheduled_date: { gte: start, lt: end } },
      orderBy: { scheduled_date: 'asc' },
    });
  }

  async updateStatus(id: bigint, status: string): Promise<void> {
    await this.prisma.planned_workout.update({ where: { id }, data: { status } });
  }
}
