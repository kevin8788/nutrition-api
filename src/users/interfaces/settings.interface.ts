export interface SettingsResponse {
  userId: string;
  language: string | null;
  darkMode: boolean | null;
  notificationsEnabled: boolean | null;
  audioCuesEnabled: boolean | null;
  voiceCoachingEnabled: boolean | null;
  locationTrackingEnabled: boolean | null;
  weightUnit: string | null;
  heightUnit: string | null;
  distanceUnit: string | null;
  updatedAt: string | null;
}
