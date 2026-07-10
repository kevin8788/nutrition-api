import { Injectable } from '@nestjs/common';
import { CreatePlannedWorkoutDto } from './dto/create-planned-workout.dto';
import {
  PlannedWorkoutResponse,
  TodayPlanResponse,
  WeekPlanResponse,
} from './interfaces/workout-responses.interface';
import { PlannedWorkoutRepository } from './repositories/planned-workout.repository';
import { resolveAnchorDate, toIsoDate, weekRange } from './utils/date-range.util';
import { mapPlanned, parseId } from './utils/workout-mappers.util';

@Injectable()
export class PlanService {
  constructor(private readonly plannedWorkouts: PlannedWorkoutRepository) {}

  async getToday(userId: string, date?: string): Promise<TodayPlanResponse> {
    const anchor = resolveAnchorDate(date);
    const planned = await this.plannedWorkouts.findForDate(
      parseId(userId, 'user id'),
      anchor,
    );

    return {
      date: toIsoDate(anchor),
      workout: planned ? mapPlanned(planned) : null,
    };
  }

  async getWeek(userId: string, date?: string): Promise<WeekPlanResponse> {
    const { start, end } = weekRange(resolveAnchorDate(date));
    const sessions = await this.plannedWorkouts.findBetween(
      parseId(userId, 'user id'),
      start,
      end,
    );

    return {
      weekStart: toIsoDate(start),
      weekEnd: toIsoDate(new Date(end.getTime() - 1)),
      sessions: sessions.map(mapPlanned),
    };
  }

  async createSession(
    userId: string,
    dto: CreatePlannedWorkoutDto,
  ): Promise<PlannedWorkoutResponse> {
    const planned = await this.plannedWorkouts.create({
      user_id: parseId(userId, 'user id'),
      title: dto.title,
      description: dto.description ?? null,
      workout_type: dto.workout_type,
      scheduled_date: resolveAnchorDate(dto.scheduled_date),
      duration_minutes: dto.duration_minutes,
      intensity: dto.intensity ?? null,
      warmup_seconds: dto.warmup_seconds ?? null,
    });

    return mapPlanned(planned);
  }
}
