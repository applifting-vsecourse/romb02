import { describe, expect, it } from "vitest"

import type { Poll } from "@/features/quack/api/quackSchemas"
import { applyVote, isPollClosed, percentOf } from "@/features/quack/lib/poll"

const aPoll = (overrides: Partial<Poll> = {}): Poll => ({
  id: "p1",
  closesAt: null,
  closed: false,
  myOptionId: null,
  resultsVisible: true,
  totalVotes: 3,
  options: [
    { id: "o1", text: "Pho", votes: 2 },
    { id: "o2", text: "Pizza", votes: 1 },
  ],
  ...overrides,
})

describe("applyVote", () => {
  it("moves one vote when switching, keeping the total", () => {
    const poll = applyVote(aPoll({ myOptionId: "o1" }), "o2")

    expect(poll.myOptionId).toBe("o2")
    expect(poll.totalVotes).toBe(3)
    expect(poll.options.map((option) => option.votes)).toEqual([1, 2])
  })

  it("adds a vote when someone who can see the counts votes for the first time", () => {
    const poll = applyVote(aPoll(), "o2")

    expect(poll.totalVotes).toBe(4)
    expect(poll.options.map((option) => option.votes)).toEqual([2, 2])
  })

  it("only marks the pick when the counts were hidden", () => {
    const hidden = aPoll({
      resultsVisible: false,
      totalVotes: undefined,
      options: [
        { id: "o1", text: "Pho" },
        { id: "o2", text: "Pizza" },
      ],
    })

    const poll = applyVote(hidden, "o1")

    expect(poll.myOptionId).toBe("o1")
    expect(poll.totalVotes).toBeUndefined()
    expect(poll.options[0]).not.toHaveProperty("votes")
  })

  it("changes nothing when voting for the current pick again", () => {
    const poll = aPoll({ myOptionId: "o1" })

    expect(applyVote(poll, "o1")).toBe(poll)
  })
})

describe("isPollClosed", () => {
  const now = new Date("2026-01-01T12:00:00Z")

  it("trusts the server when it says closed", () => {
    expect(isPollClosed(aPoll({ closed: true }), now)).toBe(true)
  })

  it("closes once the deadline passes while the page is open", () => {
    expect(isPollClosed(aPoll({ closesAt: new Date("2026-01-01T11:59:00Z") }), now)).toBe(true)
  })

  it("stays open before the deadline and without one", () => {
    expect(isPollClosed(aPoll({ closesAt: new Date("2026-01-01T13:00:00Z") }), now)).toBe(false)
    expect(isPollClosed(aPoll(), now)).toBe(false)
  })
})

describe("percentOf", () => {
  it("rounds to whole percents and handles no votes", () => {
    expect(percentOf(1, 3)).toBe(33)
    expect(percentOf(0, 0)).toBe(0)
  })
})
