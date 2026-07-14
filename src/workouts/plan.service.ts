import { Injectable, NotFoundException } from '@nestjs/common';
import { AnthropicService, WorkoutPlanContext } from '../anthropic/anthropic.service';
import { CreatePlannedWorkoutDto } from './dto/create-planned-workout.dto';
import { GenerateAiPlanDto } from './dto/generate-ai-plan.dto';
import { LogWorkoutDto } from './dto/log-workout.dto';
import { SaveAiPlanDto } from './dto/save-ai-plan.dto';
import { AiWorkoutPlan } from './interfaces/ai-plan.interface';
import {
  PlannedWorkoutResponse,
  TodayPlanResponse,
  WeekPlanResponse,
  WorkoutSessionResponse,
} from './interfaces/workout-responses.interface';
import { PlannedWorkoutRepository } from './repositories/planned-workout.repository';
import { UserProfileRepository, UserProfileWrite } from './repositories/user-profile.repository';
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

  async saveAiPlan(userId: string, dto: SaveAiPlanDto): Promise<{ success: boolean; savedCount: number }> {
    const userBigInt = parseId(userId, 'user id');
    const plan = dto.plan;
    const sessions = this.extractSessions(plan);

    if (sessions.length === 0) {
      return { success: true, savedCount: 0 };
    }

    const created = await Promise.all(
      sessions.map((s, index) =>
        this.plannedWorkouts.create({
          user_id: userBigInt,
          title: s.title,
          description: s.description ?? null,
          workout_type: s.workoutType,
          scheduled_date: this.dateFromOffset(index),
          duration_minutes: s.durationMinutes,
          intensity: s.intensity ?? null,
          warmup_seconds: null,
        }),
      ),
    );

    return { success: true, savedCount: created.length };
  }

  private extractSessions(plan: Record<string, any>): Array<{
    title: string;
    description: string | null;
    workoutType: string;
    durationMinutes: number;
    intensity: string | null;
  }> {
    const schedule: unknown[] = plan.weeklySchedule ?? [];
    const result: ReturnType<typeof this.extractSessions> = [];

    for (const entry of schedule) {
      if (!entry || typeof entry !== 'object') continue;
      const e = entry as Record<string, any>;

      // Shape A: { day, workoutType, durationMinutes, intensity, description }
      if (typeof e.workoutType === 'string') {
        result.push({
          title: e.workoutType.replace(/_/g, ' '),
          description: typeof e.description === 'string' ? e.description : null,
          workoutType: e.workoutType,
          durationMinutes: Number(e.durationMinutes) || 30,
          intensity: typeof e.intensity === 'string' ? e.intensity : null,
        });
        continue;
      }

      // Shape B: { week, sessions: [{ type, duration, ... }] }
      const sessions: unknown[] = Array.isArray(e.sessions) ? e.sessions : [];
      for (const s of sessions) {
        if (!s || typeof s !== 'object') continue;
        const sess = s as Record<string, any>;
        const workoutType = sess.type ?? sess.workoutType ?? sess.activityType ?? 'walk';
        result.push({
          title: String(workoutType).replace(/_/g, ' '),
          description: typeof sess.description === 'string' ? sess.description : null,
          workoutType: String(workoutType),
          durationMinutes: Number(sess.duration ?? sess.durationMinutes) || 30,
          intensity: typeof sess.intensity === 'string' ? sess.intensity : null,
        });
      }
    }

    return result;
  }

  private dateFromOffset(index: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + index + 1);
    return date;
  }

  async generateAiPlan(
    userId: string,
    dto?: GenerateAiPlanDto,
  ): Promise<{ success: boolean; data: AiWorkoutPlan }> {
    const id = parseId(userId, 'user id');
    const inputProfile = this.extractInputProfile(dto);

    const profile = inputProfile
      ? await this.userProfiles.upsertForUser(id, inputProfile)
      : await this.userProfiles.findByUserId(id);

    if (!profile) {
      throw new NotFoundException('User profile not found. Please complete your profile first.');
    }

    const data = await this.anthropic.generateWorkoutPlan(
      {
        weight: profile.weight,
        height: profile.height,
        activityLevel: profile.activity_level,
        dailyWalkingMinutes: profile.daily_walking_minutes ? Number(profile.daily_walking_minutes) : null,
        hasRunBefore: profile.has_run_before,
        daysPerWeek: profile.days_per_week,
        preferredLocation: profile.preferred_location,
        goalType: profile.goal_type,
        intensityPreference: profile.intensity_preference,
      },
      this.extractPlanContext(dto),
    );

    return { success: true, data };
  }

  private extractPlanContext(dto?: GenerateAiPlanDto): WorkoutPlanContext {
    const input = dto?.input;
    if (!input) {
      return {};
    }

    return {
      startDate: typeof input.startDate === 'string' ? input.startDate : undefined,
      durationWeeks: typeof input.durationWeeks === 'number' ? input.durationWeeks : undefined,
      healthFlags:
        typeof input.healthFlags === 'object' && input.healthFlags !== null
          ? (input.healthFlags as Record<string, unknown>)
          : undefined,
      recentWorkoutLogs: Array.isArray(input.recentWorkoutLogs) ? input.recentWorkoutLogs : undefined,
      recentWearableMetrics: Array.isArray(input.recentWearableMetrics)
        ? input.recentWearableMetrics
        : undefined,
    };
  }

  // Maps the mobile app's PlanGenerationInput.profile (camelCase, metric
  // suffixes) onto user_profile columns. Unknown or malformed fields fall
  // back to null so a partial onboarding still produces a usable profile.
  private extractInputProfile(dto?: GenerateAiPlanDto): UserProfileWrite | null {
    const profile = dto?.input?.profile as Record<string, unknown> | undefined;

    if (!profile || typeof profile !== 'object') {
      return null;
    }

    return {
      weight: typeof profile.weightKg === 'number' ? profile.weightKg : null,
      height: typeof profile.heightCm === 'number' ? profile.heightCm : null,
      activity_level: typeof profile.activityLevel === 'string' ? profile.activityLevel : null,
      daily_walking_minutes:
        typeof profile.walkingCapacityMinutes === 'number'
          ? BigInt(Math.round(profile.walkingCapacityMinutes))
          : null,
      has_run_before: typeof profile.hasRunBefore === 'boolean' ? profile.hasRunBefore : null,
      days_per_week:
        typeof profile.availableDaysPerWeek === 'number' ? profile.availableDaysPerWeek : null,
      preferred_location:
        typeof profile.trainingLocation === 'string' ? profile.trainingLocation : null,
      goal_type: typeof profile.goal === 'string' ? profile.goal : null,
      intensity_preference:
        typeof profile.preferredIntensity === 'string' ? profile.preferredIntensity : null,
    };
  }
}
