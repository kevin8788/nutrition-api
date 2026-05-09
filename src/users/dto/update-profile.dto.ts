import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum ActivityLevel {
  SEDENTARY = 'sedentary',
  LIGHT = 'light',
  MODERATE = 'moderate',
  ACTIVE = 'active',
  VERY_ACTIVE = 'very_active',
}

export enum GoalType {
  LOSE_WEIGHT = 'lose_weight',
  MAINTAIN = 'maintain',
  GAIN_MUSCLE = 'gain_muscle',
}

export enum PreferredLocation {
  OUTDOOR = 'outdoor',
  INDOOR = 'indoor',
  BOTH = 'both',
}

export enum IntensityPreference {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
}

export class UpdateProfileDto {
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(500)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(300)
  height?: number;

  @IsOptional()
  @IsEnum(ActivityLevel)
  activity_level?: ActivityLevel;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1440)
  daily_walking_minutes?: number;

  @IsOptional()
  @IsBoolean()
  has_run_before?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(7)
  days_per_week?: number;

  @IsOptional()
  @IsEnum(PreferredLocation)
  preferred_location?: PreferredLocation;

  @IsOptional()
  @IsEnum(GoalType)
  goal_type?: GoalType;

  @IsOptional()
  @IsEnum(IntensityPreference)
  intensity_preference?: IntensityPreference;
}
