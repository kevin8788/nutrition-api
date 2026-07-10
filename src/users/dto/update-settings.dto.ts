import { IsBoolean, IsOptional, IsString } from 'class-validator';

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
  @IsString()
  weight_unit?: string;

  @IsOptional()
  @IsString()
  height_unit?: string;

  @IsOptional()
  @IsString()
  distance_unit?: string;
}
