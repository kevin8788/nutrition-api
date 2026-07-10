export interface WorkoutSessionResponse {
  id: string;
  title: string;
  workoutType: string;
  status: string;
  isIndoor: boolean;
  plannedWorkoutId: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  distanceKm: number;
  avgSpeedKmh: number | null;
  calories: number;
  effortRating: number | null;
}

export interface PlannedWorkoutResponse {
  id: string;
  title: string;
  description: string | null;
  workoutType: string;
  scheduledDate: string;
  durationMinutes: number;
  intensity: string | null;
  warmupSeconds: number | null;
  status: string;
}

export interface TodayPlanResponse {
  date: string;
  workout: PlannedWorkoutResponse | null;
}

export interface WeekPlanResponse {
  weekStart: string;
  weekEnd: string;
  sessions: PlannedWorkoutResponse[];
}

export interface GeneratedPlanResponse {
  startDate: string;
  endDate: string;
  sessions: PlannedWorkoutResponse[];
}

export interface GoalProgress {
  completed: number;
  target: number;
}

export interface WeeklyProgressResponse {
  weekStart: string;
  weekEnd: string;
  workouts: GoalProgress;
  minutes: GoalProgress;
  distanceKm: GoalProgress;
}

export interface WeeklyGoalResponse {
  workoutsTarget: number;
  minutesTarget: number;
  distanceTargetKm: number;
}
