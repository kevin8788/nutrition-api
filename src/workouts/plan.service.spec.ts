import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { user_profile } from '@prisma/client';
import { AnthropicService } from '../anthropic/anthropic.service';
import { AiWorkoutPlan } from './interfaces/ai-plan.interface';
import { PlanService } from './plan.service';
import { PlannedWorkoutRepository } from './repositories/planned-workout.repository';
import { UserProfileRepository } from './repositories/user-profile.repository';
import { WorkoutSessionRepository } from './repositories/workout-session.repository';

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

const aiPlan: AiWorkoutPlan = {
  plan_name: 'Test Plan',
  duration_weeks: 4,
  weekly_schedule: [],
  progression_notes: [],
  data_limitations: [],
};

describe('PlanService', () => {
  let service: PlanService;
  let userProfiles: jest.Mocked<UserProfileRepository>;
  let anthropic: jest.Mocked<AnthropicService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PlanService,
        {
          provide: PlannedWorkoutRepository,
          useValue: {
            findForDate: jest.fn(),
            findBetween: jest.fn(),
            create: jest.fn(),
            createMany: jest.fn(),
          },
        },
        {
          provide: WorkoutSessionRepository,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: UserProfileRepository,
          useValue: {
            findByUserId: jest.fn(),
            upsertForUser: jest.fn(),
          },
        },
        {
          provide: AnthropicService,
          useValue: {
            generateWorkoutPlan: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(PlanService);
    userProfiles = moduleRef.get(UserProfileRepository);
    anthropic = moduleRef.get(AnthropicService);
  });

  describe('generateAiPlan', () => {
    it('upserts the profile from the request input and generates the plan with it', async () => {
      const upserted = buildProfile({ weight: 92, height: 180 });
      userProfiles.upsertForUser.mockResolvedValue(upserted);
      anthropic.generateWorkoutPlan.mockResolvedValue(aiPlan);

      const result = await service.generateAiPlan('42', {
        prompt: 'client-built prompt (ignored)',
        input: {
          profile: {
            age: 30,
            weightKg: 92,
            heightCm: 180,
            sex: 'male',
            activityLevel: 'moderate',
            walkingCapacityMinutes: 30,
            hasRunBefore: true,
            availableDaysPerWeek: 3,
            trainingLocation: 'outdoor',
            goal: 'lose_weight',
            preferredIntensity: 'medium',
          },
          healthFlags: { jointPain: true },
          recentWorkoutLogs: [],
          recentWearableMetrics: [],
          startDate: '2026-07-14',
          durationWeeks: 4,
        },
      });

      expect(userProfiles.upsertForUser).toHaveBeenCalledWith(42n, {
        weight: 92,
        height: 180,
        activity_level: 'moderate',
        daily_walking_minutes: 30n,
        has_run_before: true,
        days_per_week: 3,
        preferred_location: 'outdoor',
        goal_type: 'lose_weight',
        intensity_preference: 'medium',
      });
      expect(anthropic.generateWorkoutPlan).toHaveBeenCalledWith(
        {
          weight: 92,
          height: 180,
          activityLevel: 'moderate',
          dailyWalkingMinutes: 30,
          hasRunBefore: true,
          daysPerWeek: 3,
          preferredLocation: 'outdoor',
          goalType: 'lose_weight',
          intensityPreference: 'medium',
        },
        {
          startDate: '2026-07-14',
          durationWeeks: 4,
          healthFlags: { jointPain: true },
          recentWorkoutLogs: [],
          recentWearableMetrics: [],
        },
      );
      expect(result).toEqual({ success: true, data: aiPlan });
    });

    it('falls back to the stored profile when the body has no input', async () => {
      userProfiles.findByUserId.mockResolvedValue(buildProfile());
      anthropic.generateWorkoutPlan.mockResolvedValue(aiPlan);

      const result = await service.generateAiPlan('42');

      expect(userProfiles.upsertForUser).not.toHaveBeenCalled();
      expect(userProfiles.findByUserId).toHaveBeenCalledWith(42n);
      expect(anthropic.generateWorkoutPlan).toHaveBeenCalledWith(
        {
          weight: 80,
          height: 175,
          activityLevel: 'moderate',
          dailyWalkingMinutes: 30,
          hasRunBefore: true,
          daysPerWeek: 3,
          preferredLocation: 'outdoor',
          goalType: 'lose_weight',
          intensityPreference: 'medium',
        },
        {},
      );
      expect(result).toEqual({ success: true, data: aiPlan });
    });

    it('throws NotFoundException when there is no input and no stored profile', async () => {
      userProfiles.findByUserId.mockResolvedValue(null);

      await expect(service.generateAiPlan('42')).rejects.toThrow(NotFoundException);
      expect(anthropic.generateWorkoutPlan).not.toHaveBeenCalled();
    });

    it('handles missing optional profile fields by storing nulls', async () => {
      const upserted = buildProfile({
        weight: null,
        height: null,
        daily_walking_minutes: null,
        has_run_before: null,
      });
      userProfiles.upsertForUser.mockResolvedValue(upserted);
      anthropic.generateWorkoutPlan.mockResolvedValue(aiPlan);

      await service.generateAiPlan('42', {
        input: {
          profile: {
            activityLevel: 'light',
            availableDaysPerWeek: 2,
            trainingLocation: 'indoor',
            goal: 'general_fitness',
            preferredIntensity: 'low',
          },
        },
      });

      expect(userProfiles.upsertForUser).toHaveBeenCalledWith(42n, {
        weight: null,
        height: null,
        activity_level: 'light',
        daily_walking_minutes: null,
        has_run_before: null,
        days_per_week: 2,
        preferred_location: 'indoor',
        goal_type: 'general_fitness',
        intensity_preference: 'low',
      });
    });
  });
});
