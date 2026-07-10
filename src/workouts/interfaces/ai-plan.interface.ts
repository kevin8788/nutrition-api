export interface AiWorkoutDay {
  day: string;
  workoutType: string;
  durationMinutes: number;
  intensity: string;
  description: string;
}

export interface AiWorkoutPlan {
  summary: string;
  weeklySchedule: AiWorkoutDay[];
  recommendations: string[];
}
