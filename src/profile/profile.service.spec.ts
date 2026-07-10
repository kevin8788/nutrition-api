import { Test } from '@nestjs/testing';
import { settings, user_profile } from '@prisma/client';
import { ProfileService } from './profile.service';
import { ProfileRepository } from './repositories/profile.repository';

const buildProfile = (overrides: Partial<user_profile> = {}): user_profile => ({
  id: 1n,
  created_at: new Date('2026-07-10T09:36:00Z'),
  user_id: 42n,
  age: 20,
  weight: 70,
  height: null,
  activity_level: null,
  daily_walking_minutes: null,
  has_run_before: null,
  days_per_week: null,
  preferred_location: null,
  goal_type: null,
  intensity_preference: null,
  updated_at: null,
  ...overrides,
});

const buildSettings = (overrides: Partial<settings> = {}): settings => ({
  id: 1n,
  created_at: new Date('2026-07-10T09:36:00Z'),
  user_id: 42n,
  language: 'en',
  dark_mode: false,
  notifications_enabled: null,
  audio_cues_enabled: null,
  voice_coaching_enabled: null,
  location_tracking_enabled: null,
  weight_unit: 'kg',
  height_unit: 'cm',
  distance_unit: 'km',
  updated_at: null,
  ...overrides,
});

describe('ProfileService', () => {
  let service: ProfileService;
  let repository: jest.Mocked<ProfileRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: ProfileRepository,
          useValue: {
            findProfile: jest.fn(),
            upsertProfile: jest.fn(),
            findSettings: jest.fn(),
            upsertSettingsUnits: jest.fn(),
            updateGender: jest.fn(),
            findUserGender: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(ProfileService);
    repository = moduleRef.get(ProfileRepository);
  });

  it('saves basic onboarding info (units, sex, age, weight)', async () => {
    repository.upsertSettingsUnits.mockResolvedValue(buildSettings());
    repository.upsertProfile.mockResolvedValue(buildProfile());

    const result = await service.saveOnboarding('42', {
      unit_system: 'metric',
      sex: 'male',
      age: 20,
      weight_kg: 70,
    });

    expect(repository.updateGender).toHaveBeenCalledWith(42n, 'male');
    expect(repository.upsertSettingsUnits).toHaveBeenCalledWith(42n, {
      weight_unit: 'kg',
      height_unit: 'cm',
      distance_unit: 'km',
    });
    expect(repository.upsertProfile).toHaveBeenCalledWith(
      42n,
      expect.objectContaining({ age: 20, weight: 70 }),
    );
    expect(result).toMatchObject({
      unitSystem: 'metric',
      sex: 'male',
      age: 20,
      weightKg: 70,
    });
  });

  it('maps imperial unit system to lb/ft/mi', async () => {
    repository.upsertSettingsUnits.mockResolvedValue(
      buildSettings({ weight_unit: 'lb', height_unit: 'ft', distance_unit: 'mi' }),
    );
    repository.upsertProfile.mockResolvedValue(buildProfile());
    repository.findUserGender.mockResolvedValue(null);

    const result = await service.saveOnboarding('42', { unit_system: 'imperial' });

    expect(repository.upsertSettingsUnits).toHaveBeenCalledWith(42n, {
      weight_unit: 'lb',
      height_unit: 'ft',
      distance_unit: 'mi',
    });
    expect(result.unitSystem).toBe('imperial');
  });

  it('does not touch gender or units when not provided', async () => {
    repository.findSettings.mockResolvedValue(null);
    repository.upsertProfile.mockResolvedValue(buildProfile({ age: 21 }));
    repository.findUserGender.mockResolvedValue('female');

    const result = await service.saveOnboarding('42', { age: 21 });

    expect(repository.updateGender).not.toHaveBeenCalled();
    expect(repository.upsertSettingsUnits).not.toHaveBeenCalled();
    expect(result.sex).toBe('female');
    expect(result.age).toBe(21);
  });

  it('returns defaults for a user with no saved data', async () => {
    repository.findProfile.mockResolvedValue(null);
    repository.findSettings.mockResolvedValue(null);
    repository.findUserGender.mockResolvedValue(null);

    const result = await service.getProfile('42');

    expect(result).toEqual({
      unitSystem: 'metric',
      sex: null,
      age: null,
      weightKg: null,
      heightCm: null,
      activityLevel: null,
      dailyWalkingMinutes: null,
      hasRunBefore: null,
      daysPerWeek: null,
      preferredLocation: null,
      goalType: null,
      intensityPreference: null,
    });
  });
});
