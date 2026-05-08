export interface UserProfileResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  gender: string | null;
  dob: string | null;
  createdAt: string;
}
