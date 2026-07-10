import { Injectable } from '@nestjs/common';
import { UpdateWeeklyGoalDto } from './dto/update-weekly-goal.dto';
import {
  WeeklyGoalResponse,
  WeeklyProgressResponse,
} from './interfaces/workout-responses.interface';
import { WeeklyGoalRepository } from './repositories/weekly-goal.repository';
import { WorkoutSessionRepository } from './repositories/workout-session.repository';
import { resolveAnchorDate, toIsoDate, weekRange } from './utils/date-range.util';
import { parseId } from './utils/workout-mappers.util';

const DEFAULT_GOALS = { workouts: 3, minutes: 60, distanceKm: 10 };

@Injectable()
export class ProgressService {
  constructor(
    private readonly sessions: WorkoutSessionRepository,
    private readonly weeklyGoals: WeeklyGoalRepository,
  ) {}

  async getWeekly(userId: string, date?: string): Promise<WeeklyProgressResponse> {
    const userBigId = parseId(userId, 'user id');
    const { start, end } = weekRange(resolveAnchorDate(date));

    const [totals, goal] = await Promise.all([
      this.sessions.aggregateCompletedBetween(userBigId, start, end),
      this.weeklyGoals.findForUser(userBigId),
    ]);

    return {
      weekStart: toIsoDate(start),
      weekEnd: toIsoDate(new Date(end.getTime() - 1)),
      workouts: {
        completed: totals.workouts,
        target: goal?.workouts_target ?? DEFAULT_GOALS.workouts,
      },
      minutes: {
        completed: Math.round(totals.durationSeconds / 60),
        target: goal?.minutes_target ?? DEFAULT_GOALS.minutes,
      },
      distanceKm: {
        completed: Math.round(totals.distanceKm * 100) / 100,
        target: goal?.distance_target_km ?? DEFAULT_GOALS.distanceKm,
      },
    };
  }

  async getGoals(userId: string): Promise<WeeklyGoalResponse> {
    const goal = await this.weeklyGoals.findForUser(parseId(userId, 'user id'));
    return {
      workoutsTarget: goal?.workouts_target ?? DEFAULT_GOALS.workouts,
      minutesTarget: goal?.minutes_target ?? DEFAULT_GOALS.minutes,
      distanceTargetKm: goal?.distance_target_km ?? DEFAULT_GOALS.distanceKm,
    };
  }

  async updateGoals(userId: string, dto: UpdateWeeklyGoalDto): Promise<WeeklyGoalResponse> {
    const goal = await this.weeklyGoals.upsertForUser(parseId(userId, 'user id'), {
      workouts_target: dto.workouts_target,
      minutes_target: dto.minutes_target,
      distance_target_km: dto.distance_target_km,
    });

    return {
      workoutsTarget: goal.workouts_target,
      minutesTarget: goal.minutes_target,
      distanceTargetKm: goal.distance_target_km,
    };
  }
}
