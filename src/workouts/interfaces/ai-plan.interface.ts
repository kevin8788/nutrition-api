// Wire schema shared with the mobile app: snake_case, validated
// client-side by aiPlanResponseSchema (FitWalk-app src/validation/schemas.ts).
export interface AiPlanSession {
  date: string;
  type: string;
  duration_minutes: number;
  distance_miles?: number | null;
  intensity: string;
  warmup: string;
  main_workout: string;
  cooldown: string;
  strength_optional?: string | null;
  safety_notes: string[];
  metrics_to_track: string[];
}

export interface AiPlanWeek {
  week: number;
  sessions: AiPlanSession[];
}

export interface AiWorkoutPlan {
  plan_name: string;
  duration_weeks: number;
  weekly_schedule: AiPlanWeek[];
  progression_notes: string[];
  data_limitations: string[];
}
