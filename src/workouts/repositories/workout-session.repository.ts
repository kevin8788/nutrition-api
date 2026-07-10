import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const withPlanned = { planned_workout: true } as const;

export type WorkoutSessionWithPlanned = Prisma.workout_sessionGetPayload<{
  include: typeof withPlanned;
}>;

export const ACTIVE_STATUSES = ['in_progress', 'paused'];

interface CreateSessionData {
  user_id: bigint;
  workout_type: string;
  planned_workout_id: bigint | null;
  is_indoor: boolean;
}

@Injectable()
export class WorkoutSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSessionData): Promise<WorkoutSessionWithPlanned> {
    return this.prisma.workout_session.create({ data, include: withPlanned });
  }

  async findByIdForUser(
    id: bigint,
    userId: bigint,
  ): Promise<WorkoutSessionWithPlanned | null> {
    return this.prisma.workout_session.findFirst({
      where: { id, user_id: userId },
      include: withPlanned,
    });
  }

  async findActiveForUser(userId: bigint): Promise<WorkoutSessionWithPlanned | null> {
    return this.prisma.workout_session.findFirst({
      where: { user_id: userId, status: { in: ACTIVE_STATUSES } },
      orderBy: { started_at: 'desc' },
      include: withPlanned,
    });
  }

  async update(
    id: bigint,
    data: Prisma.workout_sessionUncheckedUpdateInput,
  ): Promise<WorkoutSessionWithPlanned> {
    return this.prisma.workout_session.update({
      where: { id },
      data,
      include: withPlanned,
    });
  }

  async findRecentCompleted(
    userId: bigint,
    limit: number,
  ): Promise<WorkoutSessionWithPlanned[]> {
    return this.prisma.workout_session.findMany({
      where: { user_id: userId, status: 'completed' },
      orderBy: { started_at: 'desc' },
      take: limit,
      include: withPlanned,
    });
  }

  async aggregateCompletedBetween(
    userId: bigint,
    start: Date,
    end: Date,
  ): Promise<{ workouts: number; durationSeconds: number; distanceKm: number }> {
    const result = await this.prisma.workout_session.aggregate({
      where: {
        user_id: userId,
        status: 'completed',
        started_at: { gte: start, lt: end },
      },
      _count: { id: true },
      _sum: { duration_seconds: true, distance_km: true },
    });

    return {
      workouts: result._count.id,
      durationSeconds: result._sum.duration_seconds ?? 0,
      distanceKm: result._sum.distance_km ?? 0,
    };
  }
}
