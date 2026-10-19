export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 4;
export const POLL_OPTION_MAX_LENGTH = 80;

// Authors pick a preset rather than a date, so there is no time zone to get
// wrong and no deadline in the past. Omitting it means the poll never closes.
export const POLL_DURATIONS = ['1h', '1d', '3d', '1w'] as const;

export type PollDuration = (typeof POLL_DURATIONS)[number];

const HOUR_IN_MS = 60 * 60 * 1000;

const POLL_DURATION_MS: Record<PollDuration, number> = {
  '1h': HOUR_IN_MS,
  '1d': 24 * HOUR_IN_MS,
  '3d': 3 * 24 * HOUR_IN_MS,
  '1w': 7 * 24 * HOUR_IN_MS,
};

export const toClosesAt = (
  duration: PollDuration | undefined,
  now: Date,
): Date | null =>
  duration ? new Date(now.getTime() + POLL_DURATION_MS[duration]) : null;

export type PollOption = {
  id: string;
  text: string;
  votes: number;
};

// A poll as loaded for one viewer: full counts plus that viewer's own vote.
// Never send this to the client as is — go through `toPollView`.
export type Poll = {
  id: string;
  quackId: string;
  authorId: string;
  closesAt: Date | null;
  options: PollOption[];
  myOptionId: string | null;
};

export type PollOptionView = {
  id: string;
  text: string;
  votes?: number;
};

export type PollView = {
  id: string;
  closesAt: Date | null;
  closed: boolean;
  myOptionId: string | null;
  resultsVisible: boolean;
  totalVotes?: number;
  options: PollOptionView[];
};

// The server clock decides when a poll closes.
export const isPollClosed = (
  poll: Pick<Poll, 'closesAt'>,
  now: Date,
): boolean =>
  poll.closesAt !== null && poll.closesAt.getTime() <= now.getTime();

// Counts stay hidden from anyone who hasn't voted on an open poll — the author
// excepted — and are left out of the payload, not just hidden in the UI.
export const toPollView = (
  poll: Poll,
  viewerId: string,
  now: Date,
): PollView => {
  const closed = isPollClosed(poll, now);
  const resultsVisible =
    closed || poll.authorId === viewerId || poll.myOptionId !== null;

  if (!resultsVisible) {
    return {
      id: poll.id,
      closesAt: poll.closesAt,
      closed,
      myOptionId: poll.myOptionId,
      resultsVisible,
      options: poll.options.map(({ id, text }) => ({ id, text })),
    };
  }

  return {
    id: poll.id,
    closesAt: poll.closesAt,
    closed,
    myOptionId: poll.myOptionId,
    resultsVisible,
    totalVotes: poll.options.reduce((sum, option) => sum + option.votes, 0),
    options: poll.options.map(({ id, text, votes }) => ({ id, text, votes })),
  };
};
