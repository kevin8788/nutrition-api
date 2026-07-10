import { Injectable } from '@nestjs/common';
import { settings, user_profile } from '@prisma/client';
import { parseId } from '../workouts/utils/workout-mappers.util';
import { SaveOnboardingDto } from './dto/save-onboarding.dto';
import { ProfileResponse } from './interfaces/profile-response.interface';
import { ProfileRepository } from './repositories/profile.repository';

const METRIC_UNITS = { weight_unit: 'kg', height_unit: 'cm', distance_unit: 'km' };
const IMPERIAL_UNITS = { weight_unit: 'lb', height_unit: 'ft', distance_unit: 'mi' };

@Injectable()
export class ProfileService {
  constructor(private readonly profiles: ProfileRepository) {}

  async getProfile(userId: string): Promise<ProfileResponse> {
    const userBigId = parseId(userId, 'user id');

    const [profile, userSettings, gender] = await Promise.all([
      this.profiles.findProfile(userBigId),
      this.profiles.findSettings(userBigId),
      this.profiles.findUserGender(userBigId),
    ]);

    return this.buildResponse(profile, userSettings, gender);
  }

  async saveOnboarding(userId: string, dto: SaveOnboardingDto): Promise<ProfileResponse> {
    const userBigId = parseId(userId, 'user id');

    if (dto.sex !== undefined) {
      await this.profiles.updateGender(userBigId, dto.sex);
    }

    let userSettings: settings | null = null;
    if (dto.unit_system !== undefined) {
      userSettings = await this.profiles.upsertSettingsUnits(
        userBigId,
        dto.unit_system === 'imperial' ? IMPERIAL_UNITS : METRIC_UNITS,
      );
    } else {
      userSettings = await this.profiles.findSettings(userBigId);
    }

    const profile = await this.profiles.upsertProfile(userBigId, {
      age: dto.age,
      weight: dto.weight_kg,
      height: dto.height_cm,
      activity_level: dto.activity_level,
      daily_walking_minutes:
        dto.daily_walking_minutes !== undefined ? BigInt(dto.daily_walking_minutes) : undefined,
      has_run_before: dto.has_run_before,
      days_per_week: dto.days_per_week,
      preferred_location: dto.preferred_location,
      goal_type: dto.goal_type,
      intensity_preference: dto.intensity_preference,
      injuries: dto.injuries,
      health_conditions: dto.health_conditions,
    });

    const gender =
      dto.sex !== undefined ? dto.sex : await this.profiles.findUserGender(userBigId);

    return this.buildResponse(profile, userSettings, gender);
  }

  private buildResponse(
    profile: user_profile | null,
    userSettings: settings | null,
    gender: string | null,
  ): ProfileResponse {
    return {
      unitSystem: userSettings?.weight_unit === 'lb' ? 'imperial' : 'metric',
      sex: gender,
      age: profile?.age ?? null,
      weightKg: profile?.weight ?? null,
      heightCm: profile?.height ?? null,
      activityLevel: profile?.activity_level ?? null,
      dailyWalkingMinutes:
        profile?.daily_walking_minutes !== null && profile?.daily_walking_minutes !== undefined
          ? Number(profile.daily_walking_minutes)
          : null,
      hasRunBefore: profile?.has_run_before ?? null,
      daysPerWeek: profile?.days_per_week ?? null,
      preferredLocation: profile?.preferred_location ?? null,
      goalType: profile?.goal_type ?? null,
      intensityPreference: profile?.intensity_preference ?? null,
      injuries: profile?.injuries ?? [],
      healthConditions: profile?.health_conditions ?? [],
    };
  }
}
