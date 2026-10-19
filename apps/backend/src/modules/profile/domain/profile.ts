import { Mood } from '@/modules/quack/domain/quack';

// Mirrors the better-auth username plugin's own rules, so a name chosen here
// is one the plugin would also have accepted at sign-up.
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-zA-Z0-9._]+$/;

export const BIO_MAX_LENGTH = 160;

export type Profile = {
  id: string;
  username: string;
  name: string;
  bio: string | null;
  defaultMood: Mood | null;
};

export type ProfileUpdate = Omit<Profile, 'id'>;

export class UsernameTakenError extends Error {
  constructor(username: string) {
    super(`Username "${username}" is already taken`);
    this.name = 'UsernameTakenError';
  }
}
