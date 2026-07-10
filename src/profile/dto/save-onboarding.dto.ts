import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
export const GOAL_TYPES = ['lose_weight', 'build_endurance', 'general_fitness'];
export const INTENSITY_PREFERENCES = ['low', 'medium', 'high'];
export const INJURIES = ['knee', 'back', 'ankle', 'hip', 'shoulder', 'wrist', 'foot'];
export const HEALTH_CONDITIONS = [
  'obesity',
  'prediabetes',
  'diabetes',
  'high_blood_pressure',
  'asthma',
  'heart_condition',
];

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
  @IsIn(ACTIVITY_LEVELS)
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
  @IsIn(GOAL_TYPES)
  goal_type?: string;

  @IsOptional()
  @IsIn(INTENSITY_PREFERENCES)
  intensity_preference?: string;

  /** Send empty arrays for "None of these apply to me". */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(INJURIES.length)
  @IsIn(INJURIES, { each: true })
  injuries?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(HEALTH_CONDITIONS.length)
  @IsIn(HEALTH_CONDITIONS, { each: true })
  health_conditions?: string[];
}
