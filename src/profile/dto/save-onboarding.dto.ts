import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Partial upsert: the app can save after each onboarding step or send
 * everything at the end. Weight/height are always metric (kg/cm); the
 * client converts for display when the user picks imperial.
 */
export class SaveOnboardingDto {
  @IsOptional()
  @IsIn(['metric', 'imperial'])
  unit_system?: string;

  @IsOptional()
  @IsIn(['male', 'female'])
  sex?: string;

  @IsOptional()
  @IsInt()
  @Min(13)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(400)
  weight_kg?: number;

  @IsOptional()
  @IsNumber()
  @Min(80)
  @Max(250)
  height_cm?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  activity_level?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  daily_walking_minutes?: number;

  @IsOptional()
  @IsBoolean()
  has_run_before?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  days_per_week?: number;

  @IsOptional()
  @IsIn(['indoor', 'outdoor', 'both'])
  preferred_location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  goal_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  intensity_preference?: string;
}
