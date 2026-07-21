import { IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateUserProfileDto {
  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsString()
  activity_level?: string;

  @IsOptional()
  @IsNumber()
  daily_walking_minutes?: number;

  @IsOptional()
  @IsBoolean()
  has_run_before?: boolean;

  @IsOptional()
  @IsInt()
  days_per_week?: number;

  @IsOptional()
  @IsString()
  preferred_location?: string;

  @IsOptional()
  @IsString()
  goal_type?: string;

  @IsOptional()
  @IsString()
  intensity_preference?: string;
}
