import { Injectable } from '@nestjs/common';
import { ProfileRepository } from '../profile/repositories/profile.repository';
import { CreatePlannedWorkoutDto } from './dto/create-planned-workout.dto';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import {
  GeneratedPlanResponse,
  PlannedWorkoutResponse,
  TodayPlanResponse,
  WeekPlanResponse,
} from './interfaces/workout-responses.interface';
import { PlannedWorkoutRepository } from './repositories/planned-workout.repository';
import { resolveAnchorDate, toIsoDate, weekRange } from './utils/date-range.util';
import { generateWeekPlan } from './utils/plan-generator.util';
import { mapPlanned, parseId } from './utils/workout-mappers.util';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PlanService {
  constructor(
    private readonly plannedWorkouts: PlannedWorkoutRepository,
    private readonly profiles: ProfileRepository,
  ) {}

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

  /**
   * "Generate My Plan": builds a 7-day rule-based plan from the onboarding
   * profile. Re-generating replaces pending (not completed) sessions in the
   * same window.
   */
  async generate(userId: string, dto: GeneratePlanDto): Promise<GeneratedPlanResponse> {
    const userBigId = parseId(userId, 'user id');
    const start = resolveAnchorDate(dto.start_date);
    const end = new Date(start.getTime() + 7 * DAY_MS);

    const profile = await this.profiles.findProfile(userBigId);
    const workouts = generateWeekPlan(profile, start);

    await this.plannedWorkouts.deletePendingBetween(userBigId, start, end);
    await this.plannedWorkouts.createMany(
      workouts.map((workout) => ({ user_id: userBigId, ...workout })),
    );

    const sessions = await this.plannedWorkouts.findBetween(userBigId, start, end);

    return {
      startDate: toIsoDate(start),
      endDate: toIsoDate(new Date(end.getTime() - 1)),
      sessions: sessions.map(mapPlanned),
    };
  }
}
