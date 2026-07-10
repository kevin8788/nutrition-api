export interface ProfileResponse {
  unitSystem: string;
  sex: string | null;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  activityLevel: string | null;
  dailyWalkingMinutes: number | null;
  hasRunBefore: boolean | null;
  daysPerWeek: number | null;
  preferredLocation: string | null;
  goalType: string | null;
  intensityPreference: string | null;
}
