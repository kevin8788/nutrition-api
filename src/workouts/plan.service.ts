import { Injectable, NotFoundException } from '@nestjs/common';
import { AnthropicService } from '../anthropic/anthropic.service';
import { CreatePlannedWorkoutDto } from './dto/create-planned-workout.dto';
import { LogWorkoutDto } from './dto/log-workout.dto';
import { AiWorkoutPlan } from './interfaces/ai-plan.interface';
import {
  PlannedWorkoutResponse,
  TodayPlanResponse,
  WeekPlanResponse,
  WorkoutSessionResponse,
} from './interfaces/workout-responses.interface';
import { PlannedWorkoutRepository } from './repositories/planned-workout.repository';
import { UserProfileRepository } from './repositories/user-profile.repository';
import { WorkoutSessionRepository } from './repositories/workout-session.repository';
import { resolveAnchorDate, toIsoDate, weekRange } from './utils/date-range.util';
import { mapPlanned, mapSession, parseId } from './utils/workout-mappers.util';

@Injectable()
export class PlanService {
  constructor(
    private readonly plannedWorkouts: PlannedWorkoutRepository,
    private readonly workoutSessions: WorkoutSessionRepository,
    private readonly userProfiles: UserProfileRepository,
    private readonly anthropic: AnthropicService,
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

  async logWorkout(userId: string, dto: LogWorkoutDto): Promise<WorkoutSessionResponse> {
    const userBigInt = parseId(userId, 'user id');

    const session = await this.workoutSessions.createLog({
      user_id: userBigInt,
      workout_type: dto.workout_type,
      planned_workout_id: dto.planned_workout_id ? parseId(dto.planned_workout_id, 'planned workout id') : null,
      is_indoor: dto.is_indoor ?? false,
      started_at: dto.started_at ? new Date(dto.started_at) : new Date(),
      ended_at: dto.ended_at ? new Date(dto.ended_at) : null,
      duration_seconds: dto.duration_seconds ?? 0,
      distance_km: dto.distance_km ?? 0,
      avg_speed_kmh: dto.avg_speed_kmh ?? null,
      calories: dto.calories ?? 0,
      effort_rating: dto.effort_rating ?? null,
    });

    return mapSession(session);
  }

  async generateAiPlan(userId: string): Promise<AiWorkoutPlan> {
    const profile = await this.userProfiles.findByUserId(parseId(userId, 'user id'));

    if (!profile) {
      throw new NotFoundException('User profile not found. Please complete your profile first.');
    }

    return this.anthropic.generateWorkoutPlan({
      weight: profile.weight,
      height: profile.height,
      activityLevel: profile.activity_level,
      dailyWalkingMinutes: profile.daily_walking_minutes ? Number(profile.daily_walking_minutes) : null,
      hasRunBefore: profile.has_run_before,
      daysPerWeek: profile.days_per_week,
      preferredLocation: profile.preferred_location,
      goalType: profile.goal_type,
      intensityPreference: profile.intensity_preference,
    });
  }
}
