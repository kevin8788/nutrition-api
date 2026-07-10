import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { WORKOUT_TYPES } from './start-workout.dto';

export class CreatePlannedWorkoutDto {
  @IsString()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsIn(WORKOUT_TYPES)
  workout_type: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'scheduled_date must be in YYYY-MM-DD format',
  })
  scheduled_date: string;

  @IsInt()
  @Min(1)
  duration_minutes: number;

  @IsOptional()
  @IsIn(['easy', 'moderate', 'hard'])
  intensity?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  warmup_seconds?: number;
}
