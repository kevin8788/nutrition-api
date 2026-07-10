import { user_profile } from '@prisma/client';
import { generateWeekPlan } from './plan-generator.util';

const buildProfile = (overrides: Partial<user_profile> = {}): user_profile => ({
  id: 1n,
  created_at: new Date('2026-07-10T09:40:00Z'),
  user_id: 42n,
  age: 20,
  weight: 70,
  height: 175,
  activity_level: 'light',
  daily_walking_minutes: 30n,
  has_run_before: false,
  days_per_week: 3,
  preferred_location: 'indoor',
  goal_type: 'general_fitness',
  intensity_preference: 'medium',
  injuries: [],
  health_conditions: [],
  updated_at: null,
  ...overrides,
});

const START = new Date('2026-07-10T00:00:00.000Z');

describe('generateWeekPlan', () => {
  it('creates the configured number of sessions with rest days spread out', () => {
    const plan = generateWeekPlan(buildProfile(), START);

    expect(plan).toHaveLength(3);
    expect(plan.map((w) => w.scheduled_date.toISOString().slice(0, 10))).toEqual([
      '2026-07-10',
      '2026-07-11',
      '2026-07-13',
    ]);
  });

  it('uses treadmill sessions for indoor preference at the chosen intensity', () => {
    const plan = generateWeekPlan(buildProfile(), START);

    for (const workout of plan) {
      expect(workout.workout_type).toBe('treadmill_cardio');
      expect(workout.title).toBe('Treadmill cardio');
      expect(workout.intensity).toBe('moderate');
      expect(workout.duration_minutes).toBe(20);
      expect(workout.warmup_seconds).toBe(120);
    }
  });

  it('alternates workout types when location is "both"', () => {
    const plan = generateWeekPlan(buildProfile({ preferred_location: 'both' }), START);
    expect(plan.map((w) => w.workout_type)).toEqual([
      'treadmill_cardio',
      'walk',
      'treadmill_cardio',
    ]);
  });

  it('lowers intensity when limitations are reported, never blocking the plan', () => {
    const plan = generateWeekPlan(
      buildProfile({ intensity_preference: 'high', health_conditions: ['asthma'] }),
      START,
    );

    expect(plan).toHaveLength(3);
    expect(plan.every((w) => w.intensity === 'moderate')).toBe(true);
  });

  it('adds duration for the lose_weight goal', () => {
    const plan = generateWeekPlan(buildProfile({ goal_type: 'lose_weight' }), START);
    expect(plan[0].duration_minutes).toBe(25);
    expect(plan[0].description).toContain('burn calories');
  });

  it('falls back to sensible defaults without a profile', () => {
    const plan = generateWeekPlan(null, START);

    expect(plan).toHaveLength(3);
    expect(plan[0].intensity).toBe('moderate');
    expect(plan[0].duration_minutes).toBe(20);
  });
});
