import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export enum WeightUnit {
  KG = 'kg',
  LBS = 'lbs',
}

export enum HeightUnit {
  CM = 'cm',
  FT = 'ft',
}

export enum DistanceUnit {
  KM = 'km',
  MILES = 'miles',
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsBoolean()
  dark_mode?: boolean;

  @IsOptional()
  @IsBoolean()
  notifications_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  audio_cues_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  voice_coaching_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  location_tracking_enabled?: boolean;

  @IsOptional()
  @IsEnum(WeightUnit)
  weight_unit?: WeightUnit;

  @IsOptional()
  @IsEnum(HeightUnit)
  height_unit?: HeightUnit;

  @IsOptional()
  @IsEnum(DistanceUnit)
  distance_unit?: DistanceUnit;
}
