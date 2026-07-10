import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateWorkoutMetricsDto {
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
}
