import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Poll, Quack } from "@/features/quack/api/quackSchemas"
import { votePoll } from "@/features/quack/api/votePoll"
import { QuackPoll } from "@/features/quack/components/QuackPoll"

vi.mock("@/features/quack/api/votePoll", () => ({ votePoll: vi.fn() }))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const aPoll = (overrides: Partial<Poll> = {}): Poll => ({
  id: "p1",
  closesAt: null,
  closed: false,
  myOptionId: null,
  resultsVisible: false,
  options: [
    { id: "o1", text: "Pho" },
    { id: "o2", text: "Pizza" },
  ],
  ...overrides,
})

const voted = (overrides: Partial<Poll> = {}): Poll =>
  aPoll({
    myOptionId: "o1",
    resultsVisible: true,
    totalVotes: 4,
    options: [
      { id: "o1", text: "Pho", votes: 3 },
      { id: "o2", text: "Pizza", votes: 1 },
    ],
    ...overrides,
  })

const aQuack = (poll: Poll): Quack => ({
  id: "q1",
  text: "Lunch?",
  mood: null,
  userId: "author",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "author", name: "Pond Admin", username: "PondAdmin" },
  poll,
})

// Renders the poll from the feed cache, the way the real page does, so the
// optimistic update and the rollback are what the user would actually see.
const renderPoll = (poll: Poll, serverPoll: Poll = poll) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const queryKey = quackKeys.list({})
  queryClient.setQueryData(queryKey, [aQuack(poll)])
  // What a refetch after the vote returns.
  const loadFeed = () => Promise.resolve([aQuack(serverPoll)])

  function Feed() {
    const { data } = useQuery({
      queryKey,
      queryFn: loadFeed,
      staleTime: Infinity,
    })
    const current = data?.[0]?.poll
    return current ? (
      <QuackPoll
        quackId="q1"
        poll={current}
      />
    ) : null
  }

  render(
    <QueryClientProvider client={queryClient}>
      <Feed />
    </QueryClientProvider>,
  )
}

describe("QuackPoll", () => {
  beforeEach(() => {
    vi.mocked(votePoll).mockReset()
    vi.mocked(toast.error).mockReset()
  })

  it("hides the counts until the viewer votes", () => {
    renderPoll(aPoll())

    expect(screen.getByRole("button", { name: "Pho" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pizza" })).toBeInTheDocument()
    expect(screen.getByText("Vote to see the results")).toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it("shows percentages, counts and the viewer's pick after voting", () => {
    renderPoll(voted())

    expect(screen.getByText("75% · 3 votes")).toBeInTheDocument()
    expect(screen.getByText("25% · 1 vote")).toBeInTheDocument()
    expect(screen.getByText("4 votes")).toBeInTheDocument()
    expect(screen.getByRole("button", { pressed: true })).toHaveTextContent(/^Pho \(your vote\)/)
  })

  it("shows final results to everyone once closed, with no way to vote", () => {
    renderPoll(
      voted({ closed: true, myOptionId: null, closesAt: new Date("2026-01-01T11:00:00Z") }),
    )

    expect(screen.getByText(/Closed/)).toBeInTheDocument()
    expect(screen.getByText("75% · 3 votes")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("shows when an open poll closes", () => {
    renderPoll(aPoll({ closesAt: new Date(Date.now() + 3 * 60 * 60 * 1000 + 1000) }))

    expect(screen.getByText(/Closes in 3 hours/)).toBeInTheDocument()
  })

  it("marks a first vote at once and fills in the counts from the server", async () => {
    let resolveVote: ((poll: Poll) => void) | undefined
    vi.mocked(votePoll).mockReturnValue(new Promise((resolve) => (resolveVote = resolve)))
    const fromServer = voted({ myOptionId: "o2", totalVotes: 2 })
    renderPoll(aPoll(), fromServer)

    await userEvent.click(screen.getByRole("button", { name: "Pizza" }))

    expect(vi.mocked(votePoll).mock.calls[0]?.[0]).toEqual({ quackId: "q1", optionId: "o2" })
    expect(screen.getByRole("button", { pressed: true })).toHaveTextContent(/^Pizza \(your vote\)/)
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()

    resolveVote?.(fromServer)
    await waitFor(() => expect(screen.getByText("2 votes")).toBeInTheDocument())
  })

  it("moves the vote at once when switching", async () => {
    vi.mocked(votePoll).mockReturnValue(new Promise<Poll>(vi.fn()))
    renderPoll(voted())

    await userEvent.click(screen.getByRole("button", { name: /Pizza/ }))

    expect(screen.getByRole("button", { pressed: true })).toHaveTextContent(/^Pizza/)
    expect(screen.getAllByText("50% · 2 votes")).toHaveLength(2)
    expect(screen.getByText("4 votes")).toBeInTheDocument()
  })

  it("rolls back and offers a retry when the vote fails", async () => {
    vi.mocked(votePoll).mockRejectedValueOnce(new Error("Network down"))
    renderPoll(voted())

    await userEvent.click(screen.getByRole("button", { name: /Pizza/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.getByText("75% · 3 votes")).toBeInTheDocument()
    expect(screen.getByRole("button", { pressed: true })).toHaveTextContent(/^Pho \(your vote\)/)

    const [message, options] = vi.mocked(toast.error).mock.calls[0] ?? []
    expect(message).toBe("Your vote didn't go through")
    expect(options?.description).toBe("Network down")

    vi.mocked(votePoll).mockResolvedValueOnce(voted({ myOptionId: "o2" }))
    const action = options?.action as unknown as { onClick: () => void }
    action.onClick()
    await waitFor(() => expect(votePoll).toHaveBeenCalledTimes(2))
    expect(vi.mocked(votePoll).mock.calls[1]?.[0]).toEqual({ quackId: "q1", optionId: "o2" })
  })
})
