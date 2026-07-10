import { BadRequestException } from '@nestjs/common';
import { planned_workout } from '@prisma/client';
import {
  PlannedWorkoutResponse,
  WorkoutSessionResponse,
} from '../interfaces/workout-responses.interface';
import { WorkoutSessionWithPlanned } from '../repositories/workout-session.repository';
import { toIsoDate } from './date-range.util';

const WORKOUT_TYPE_LABELS: Record<string, string> = {
  walk: 'Walk',
  run: 'Run',
  treadmill_cardio: 'Treadmill cardio',
};

export function parseId(value: string, fieldName = 'id'): bigint {
  try {
    return BigInt(value);
  } catch {
    throw new BadRequestException(`Invalid ${fieldName}`);
  }
}

export function mapSession(session: WorkoutSessionWithPlanned): WorkoutSessionResponse {
  return {
    id: session.id.toString(),
    title:
      session.planned_workout?.title ??
      WORKOUT_TYPE_LABELS[session.workout_type] ??
      session.workout_type,
    workoutType: session.workout_type,
    status: session.status,
    isIndoor: session.is_indoor,
    plannedWorkoutId: session.planned_workout_id?.toString() ?? null,
    startedAt: session.started_at.toISOString(),
    endedAt: session.ended_at?.toISOString() ?? null,
    durationSeconds: session.duration_seconds,
    distanceKm: session.distance_km,
    avgSpeedKmh: session.avg_speed_kmh,
    calories: session.calories,
    effortRating: session.effort_rating,
  };
}

export function mapPlanned(planned: planned_workout): PlannedWorkoutResponse {
  return {
    id: planned.id.toString(),
    title: planned.title,
    description: planned.description,
    workoutType: planned.workout_type,
    scheduledDate: toIsoDate(planned.scheduled_date),
    durationMinutes: planned.duration_minutes,
    intensity: planned.intensity,
    warmupSeconds: planned.warmup_seconds,
    status: planned.status,
  };
}
