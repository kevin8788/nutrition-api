import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsNumberString,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { WORKOUT_TYPES } from './start-workout.dto';

export class LogWorkoutDto {
  @IsIn(WORKOUT_TYPES)
  workout_type: string;

  @IsOptional()
  @IsBoolean()
  is_indoor?: boolean;

  @IsOptional()
  @IsNumberString()
  planned_workout_id?: string;

  @IsOptional()
  @IsISO8601()
  started_at?: string;

  @IsOptional()
  @IsISO8601()
  ended_at?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration_seconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distance_km?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  avg_speed_kmh?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  calories?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  effort_rating?: number;
}
