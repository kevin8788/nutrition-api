export interface UserProfileResponse {
  userId: string;
  weight: number | null;
  height: number | null;
  activityLevel: string | null;
  dailyWalkingMinutes: number | null;
  hasRunBefore: boolean | null;
  daysPerWeek: number | null;
  preferredLocation: string | null;
  goalType: string | null;
  intensityPreference: string | null;
  updatedAt: string | null;
}
