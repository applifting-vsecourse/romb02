import type { Poll } from "@/features/quack/api/quackSchemas"

// Mirrors the server-side DTO — the server still validates independently.
export const POLL_MIN_OPTIONS = 2
export const POLL_MAX_OPTIONS = 4
export const POLL_OPTION_MAX_LENGTH = 80

export const POLL_DURATIONS = ["1h", "1d", "3d", "1w"] as const

export type PollDuration = (typeof POLL_DURATIONS)[number]

export const pollDurationLabels: Record<PollDuration, string> = {
  "1h": "In 1 hour",
  "1d": "In 1 day",
  "3d": "In 3 days",
  "1w": "In 1 week",
}

// The server marks a poll closed when the feed is loaded, but the deadline can
// pass while the page is open.
export function isPollClosed(poll: Poll, now: Date = new Date()): boolean {
  return poll.closed || (poll.closesAt !== null && poll.closesAt.getTime() <= now.getTime())
}

export function percentOf(votes: number, total: number): number {
  return total === 0 ? 0 : Math.round((votes / total) * 100)
}

// What the poll should look like the moment the user clicks, before the server
// answers. A switch moves one vote between answers. A first vote from someone
// who couldn't see the counts only marks their pick — the counts were never
// sent to them, so they arrive with the server's response.
export function applyVote(poll: Poll, optionId: string): Poll {
  const previous = poll.myOptionId
  if (previous === optionId) return poll
  if (!poll.resultsVisible) return { ...poll, myOptionId: optionId }

  return {
    ...poll,
    myOptionId: optionId,
    totalVotes: (poll.totalVotes ?? 0) + (previous === null ? 1 : 0),
    options: poll.options.map((option) => ({
      ...option,
      votes:
        (option.votes ?? 0) + (option.id === optionId ? 1 : 0) - (option.id === previous ? 1 : 0),
    })),
  }
}
