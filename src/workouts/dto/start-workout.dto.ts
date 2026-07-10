import { IsBoolean, IsIn, IsNumberString, IsOptional } from 'class-validator';

export const WORKOUT_TYPES = ['walk', 'run', 'treadmill_cardio'] as const;

export class StartWorkoutDto {
  @IsIn(WORKOUT_TYPES)
  workout_type: string;

  @IsOptional()
  @IsNumberString()
  planned_workout_id?: string;

  @IsOptional()
  @IsBoolean()
  is_indoor?: boolean;
}
