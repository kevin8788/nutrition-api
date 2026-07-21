import { Test } from '@nestjs/testing';
import { user_profile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserProfileRepository } from '../workouts/repositories/user-profile.repository';
import { SettingsRepository } from './repositories/settings.repository';
import { UsersService } from './users.service';

const buildProfile = (overrides: Partial<user_profile> = {}): user_profile => ({
  id: 1n,
  created_at: new Date('2026-07-10T08:00:00Z'),
  user_id: 42n,
  weight: 80,
  height: 175,
  activity_level: 'moderate',
  daily_walking_minutes: 30n,
  has_run_before: true,
  days_per_week: 3,
  preferred_location: 'outdoor',
  goal_type: 'lose_weight',
  intensity_preference: 'medium',
  updated_at: null,
  ...overrides,
});

describe('UsersService — profile', () => {
  let service: UsersService;
  let userProfiles: jest.Mocked<UserProfileRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: {} },
        { provide: SettingsRepository, useValue: {} },
        {
          provide: UserProfileRepository,
          useValue: {
            findByUserId: jest.fn(),
            upsertForUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    userProfiles = moduleRef.get(UserProfileRepository);
  });

  describe('getProfile', () => {
    it('returns the mapped profile wrapped in { success, data } when one exists', async () => {
      userProfiles.findByUserId.mockResolvedValue(buildProfile());

      const result = await service.getProfile('42');

      expect(result).toEqual({
        success: true,
        data: {
          userId: '42',
          weight: 80,
          height: 175,
          activityLevel: 'moderate',
          dailyWalkingMinutes: 30,
          hasRunBefore: true,
          daysPerWeek: 3,
          preferredLocation: 'outdoor',
          goalType: 'lose_weight',
          intensityPreference: 'medium',
          updatedAt: null,
        },
      });
      expect(userProfiles.findByUserId).toHaveBeenCalledWith(42n);
    });

    it('returns an empty default profile when none exists yet', async () => {
      userProfiles.findByUserId.mockResolvedValue(null);

      const result = await service.getProfile('42');

      expect(result).toEqual({
        success: true,
        data: {
          userId: '42',
          weight: null,
          height: null,
          activityLevel: null,
          dailyWalkingMinutes: null,
          hasRunBefore: null,
          daysPerWeek: null,
          preferredLocation: null,
          goalType: null,
          intensityPreference: null,
          updatedAt: null,
        },
      });
    });
  });

  describe('upsertProfile', () => {
    it('upserts using the userId from the JWT, never from the dto, and returns the mapped result', async () => {
      const upserted = buildProfile({ weight: 92, height: 180, daily_walking_minutes: 45n });
      userProfiles.upsertForUser.mockResolvedValue(upserted);

      const result = await service.upsertProfile('42', {
        weight: 92,
        height: 180,
        daily_walking_minutes: 45,
      });

      expect(userProfiles.upsertForUser).toHaveBeenCalledWith(42n, {
        weight: 92,
        height: 180,
        activity_level: undefined,
        daily_walking_minutes: 45n,
        has_run_before: undefined,
        days_per_week: undefined,
        preferred_location: undefined,
        goal_type: undefined,
        intensity_preference: undefined,
      });
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({ userId: '42', weight: 92, height: 180, dailyWalkingMinutes: 45 }),
      });
    });
  });
});
