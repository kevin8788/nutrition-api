import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { UpdateWorkoutMetricsDto } from './update-workout-metrics.dto';

export class FinishWorkoutDto extends UpdateWorkoutMetricsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  effort_rating?: number;
}
