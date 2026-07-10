import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FinishWorkoutDto } from './dto/finish-workout.dto';
import { StartWorkoutDto } from './dto/start-workout.dto';
import { UpdateWorkoutMetricsDto } from './dto/update-workout-metrics.dto';
import { WorkoutSessionResponse } from './interfaces/workout-responses.interface';
import { PlannedWorkoutRepository } from './repositories/planned-workout.repository';
import {
  ACTIVE_STATUSES,
  WorkoutSessionRepository,
  WorkoutSessionWithPlanned,
} from './repositories/workout-session.repository';
import { mapSession, parseId } from './utils/workout-mappers.util';

@Injectable()
export class WorkoutsService {
  constructor(
    private readonly sessions: WorkoutSessionRepository,
    private readonly plannedWorkouts: PlannedWorkoutRepository,
  ) {}

  async start(userId: string, dto: StartWorkoutDto): Promise<WorkoutSessionResponse> {
    const userBigId = parseId(userId, 'user id');

    const active = await this.sessions.findActiveForUser(userBigId);
    if (active) {
      throw new ConflictException(
        `An active workout session already exists (id ${active.id.toString()})`,
      );
    }

    let plannedWorkoutId: bigint | null = null;
    if (dto.planned_workout_id) {
      const planned = await this.plannedWorkouts.findByIdForUser(
        parseId(dto.planned_workout_id, 'planned_workout_id'),
        userBigId,
      );
      if (!planned) {
        throw new NotFoundException('Planned workout not found');
      }
      plannedWorkoutId = planned.id;
    }

    const session = await this.sessions.create({
      user_id: userBigId,
      workout_type: dto.workout_type,
      planned_workout_id: plannedWorkoutId,
      is_indoor: dto.is_indoor ?? false,
    });

    return mapSession(session);
  }

  async getActive(userId: string): Promise<WorkoutSessionResponse | null> {
    const active = await this.sessions.findActiveForUser(parseId(userId, 'user id'));
    return active ? mapSession(active) : null;
  }

  async pause(userId: string, sessionId: string): Promise<WorkoutSessionResponse> {
    const session = await this.findOwnedSession(userId, sessionId);
    this.assertStatus(session, ['in_progress'], 'pause');
    return mapSession(await this.sessions.update(session.id, { status: 'paused' }));
  }

  async resume(userId: string, sessionId: string): Promise<WorkoutSessionResponse> {
    const session = await this.findOwnedSession(userId, sessionId);
    this.assertStatus(session, ['paused'], 'resume');
    return mapSession(await this.sessions.update(session.id, { status: 'in_progress' }));
  }

  async updateMetrics(
    userId: string,
    sessionId: string,
    dto: UpdateWorkoutMetricsDto,
  ): Promise<WorkoutSessionResponse> {
    const session = await this.findOwnedSession(userId, sessionId);
    this.assertStatus(session, ACTIVE_STATUSES, 'update');
    return mapSession(await this.sessions.update(session.id, this.metricsData(dto)));
  }

  async finish(
    userId: string,
    sessionId: string,
    dto: FinishWorkoutDto,
  ): Promise<WorkoutSessionResponse> {
    const session = await this.findOwnedSession(userId, sessionId);
    this.assertStatus(session, ACTIVE_STATUSES, 'finish');

    const updated = await this.sessions.update(session.id, {
      ...this.metricsData(dto),
      effort_rating: dto.effort_rating,
      status: 'completed',
      ended_at: new Date(),
    });

    if (session.planned_workout_id) {
      await this.plannedWorkouts.updateStatus(session.planned_workout_id, 'completed');
    }

    return mapSession(updated);
  }

  async discard(userId: string, sessionId: string): Promise<WorkoutSessionResponse> {
    const session = await this.findOwnedSession(userId, sessionId);
    this.assertStatus(session, ACTIVE_STATUSES, 'discard');
    return mapSession(
      await this.sessions.update(session.id, {
        status: 'discarded',
        ended_at: new Date(),
      }),
    );
  }

  async recent(userId: string, limit: number): Promise<WorkoutSessionResponse[]> {
    const sessions = await this.sessions.findRecentCompleted(
      parseId(userId, 'user id'),
      limit,
    );
    return sessions.map(mapSession);
  }

  private async findOwnedSession(
    userId: string,
    sessionId: string,
  ): Promise<WorkoutSessionWithPlanned> {
    const session = await this.sessions.findByIdForUser(
      parseId(sessionId, 'session id'),
      parseId(userId, 'user id'),
    );
    if (!session) {
      throw new NotFoundException('Workout session not found');
    }
    return session;
  }

  private assertStatus(
    session: WorkoutSessionWithPlanned,
    allowed: string[],
    action: string,
  ): void {
    if (!allowed.includes(session.status)) {
      throw new ConflictException(
        `Cannot ${action} a workout session with status "${session.status}"`,
      );
    }
  }

  private metricsData(
    dto: UpdateWorkoutMetricsDto,
  ): Prisma.workout_sessionUncheckedUpdateInput {
    return {
      duration_seconds: dto.duration_seconds,
      distance_km: dto.distance_km,
      avg_speed_kmh: dto.avg_speed_kmh,
      calories: dto.calories,
    };
  }
}
