import { user_profile } from '@prisma/client';

export interface GeneratedWorkout {
  title: string;
  description: string | null;
  workout_type: string;
  scheduled_date: Date;
  duration_minutes: number;
  intensity: string;
  warmup_seconds: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Spread N sessions over the 7-day window with rest days in between.
const DAY_OFFSETS: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 1, 3],
  4: [0, 1, 3, 5],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

const BASE_DURATION_BY_ACTIVITY: Record<string, number> = {
  sedentary: 15,
  light: 20,
  moderate: 25,
  active: 30,
  very_active: 35,
};

const INTENSITY_BY_PREFERENCE: Record<string, string> = {
  low: 'easy',
  medium: 'moderate',
  high: 'hard',
};

const TITLES: Record<string, string> = {
  walk: 'Brisk walk',
  treadmill_cardio: 'Treadmill cardio',
};

const DESCRIPTIONS: Record<string, string> = {
  lose_weight: 'Steady pace to burn calories and reduce body fat.',
  build_endurance: 'Purposeful pace to improve cardiovascular fitness.',
  general_fitness: 'Comfortable, conversational pace to stay healthy and active.',
};

function downgrade(intensity: string): string {
  if (intensity === 'hard') return 'moderate';
  if (intensity === 'moderate') return 'easy';
  return 'easy';
}

/**
 * Rule-based weekly plan from the onboarding profile. Limitations (injuries
 * or health conditions) never block the plan — they lower its intensity.
 */
export function generateWeekPlan(
  profile: user_profile | null,
  startDate: Date,
): GeneratedWorkout[] {
  const daysPerWeek = Math.min(Math.max(profile?.days_per_week ?? 3, 1), 7);

  let intensity =
    INTENSITY_BY_PREFERENCE[profile?.intensity_preference ?? ''] ?? 'moderate';
  const hasLimitations =
    (profile?.injuries?.length ?? 0) > 0 || (profile?.health_conditions?.length ?? 0) > 0;
  if (hasLimitations) {
    intensity = downgrade(intensity);
  }

  let duration = BASE_DURATION_BY_ACTIVITY[profile?.activity_level ?? ''] ?? 20;
  if (profile?.goal_type === 'lose_weight') {
    duration += 5;
  }

  const location = profile?.preferred_location ?? 'both';
  const description = DESCRIPTIONS[profile?.goal_type ?? 'general_fitness'] ?? null;

  return DAY_OFFSETS[daysPerWeek].map((offset, index) => {
    const workoutType =
      location === 'indoor'
        ? 'treadmill_cardio'
        : location === 'outdoor'
          ? 'walk'
          : index % 2 === 0
            ? 'treadmill_cardio'
            : 'walk';

    return {
      title: TITLES[workoutType],
      description,
      workout_type: workoutType,
      scheduled_date: new Date(startDate.getTime() + offset * DAY_MS),
      duration_minutes: duration,
      intensity,
      warmup_seconds: 120,
    };
  });
}
