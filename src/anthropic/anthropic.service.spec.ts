import Anthropic from '@anthropic-ai/sdk';
import { AnthropicService } from './anthropic.service';
import { UserProfileData } from './anthropic.service';

jest.mock('@anthropic-ai/sdk');

const mockCreate = jest.fn();
(Anthropic as unknown as jest.Mock).mockImplementation(() => ({
  messages: { create: mockCreate },
}));

const profile: UserProfileData = {
  weight: 92,
  height: 180,
  activityLevel: 'moderate',
  dailyWalkingMinutes: 30,
  hasRunBefore: true,
  daysPerWeek: 3,
  preferredLocation: 'outdoor',
  goalType: 'lose_weight',
  intensityPreference: 'medium',
};

const wirePlan = {
  plan_name: 'Beginner Walk Plan',
  duration_weeks: 4,
  weekly_schedule: [
    {
      week: 1,
      sessions: [
        {
          date: '2026-07-14',
          type: 'easy_walk',
          duration_minutes: 30,
          distance_miles: null,
          intensity: 'easy',
          warmup: '5 min slow walk',
          main_workout: '20 min steady walk',
          cooldown: '5 min slow walk',
          strength_optional: null,
          safety_notes: [],
          metrics_to_track: ['steps'],
        },
      ],
    },
  ],
  progression_notes: ['Increase duration by 10% weekly'],
  data_limitations: [],
};

const modelResponse = (text: string) => ({
  content: [{ type: 'text', text }],
});

describe('AnthropicService', () => {
  let service: AnthropicService;

  beforeAll(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  beforeEach(() => {
    mockCreate.mockReset();
    service = new AnthropicService();
  });

  describe('generateWorkoutPlan', () => {
    it('returns the wire-schema plan parsed from the model response', async () => {
      mockCreate.mockResolvedValue(modelResponse(JSON.stringify(wirePlan)));

      const result = await service.generateWorkoutPlan(profile, {
        startDate: '2026-07-14',
        durationWeeks: 4,
      });

      expect(result).toEqual(wirePlan);
    });

    it('asks the model for the snake_case wire schema with profile and plan context', async () => {
      mockCreate.mockResolvedValue(modelResponse(JSON.stringify(wirePlan)));

      await service.generateWorkoutPlan(profile, {
        startDate: '2026-07-14',
        durationWeeks: 4,
        healthFlags: { jointPain: true },
      });

      const request = mockCreate.mock.calls[0][0];
      const fullPrompt = `${request.system}\n${request.messages[0].content}`;

      expect(fullPrompt).toContain('"plan_name"');
      expect(fullPrompt).toContain('"duration_weeks"');
      expect(fullPrompt).toContain('"weekly_schedule"');
      expect(fullPrompt).toContain('"main_workout"');
      expect(fullPrompt).toContain('2026-07-14');
      expect(fullPrompt).toContain('jointPain');
      expect(fullPrompt).toContain('92');
    });

    it('leaves enough output budget for a multi-week plan', async () => {
      mockCreate.mockResolvedValue(modelResponse(JSON.stringify(wirePlan)));

      await service.generateWorkoutPlan(profile, {});

      expect(mockCreate.mock.calls[0][0].max_tokens).toBeGreaterThanOrEqual(8000);
    });
  });
});
