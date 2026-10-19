import { Poll, PollView } from './poll';

export const MOODS = ['happy', 'sad', 'angry', 'silly'] as const;

export type Mood = (typeof MOODS)[number];

export type QuackAuthor = {
  id: string;
  name: string;
  username: string;
};

export type Quack = {
  id: string;
  text: string;
  mood: Mood | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: QuackAuthor;
  // Loaded for one viewer; `undefined` when not loaded, `null` for no poll.
  poll?: Poll | null;
};

// A quack as one viewer is allowed to see it.
export type QuackView = Omit<Quack, 'poll'> & { poll: PollView | null };
