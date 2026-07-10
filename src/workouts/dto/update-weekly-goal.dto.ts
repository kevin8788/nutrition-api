import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateWeeklyGoalDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  workouts_target?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minutes_target?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distance_target_km?: number;
}
