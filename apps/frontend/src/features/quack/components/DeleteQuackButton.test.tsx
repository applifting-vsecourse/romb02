import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { deleteQuack } from "@/features/quack/api/deleteQuack"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackList } from "@/features/quack/components/QuackList"

vi.mock("@/features/quack/api/deleteQuack", () => ({ deleteQuack: vi.fn() }))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const aQuack = (overrides: Partial<Quack> = {}): Quack => ({
  id: "q1",
  text: "my quack",
  mood: null,
  userId: "me",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "me", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: null,
  ...overrides,
})

const mine = aQuack()
const theirs = aQuack({
  id: "q2",
  text: "their quack",
  userId: "them",
  user: { id: "them", name: "Pond Admin", username: "PondAdmin" },
})

// Renders the feed from the query cache, the way the real page does, so a
// deleted quack disappearing is what the user would actually see.
const renderFeed = (quacks: Quack[], serverQuacks: Quack[] = quacks) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const queryKey = quackKeys.list({})
  queryClient.setQueryData(queryKey, quacks)
  // What a refetch after the delete returns.
  const loadFeed = () => Promise.resolve(serverQuacks)

  function Feed() {
    const { data } = useQuery({
      queryKey,
      queryFn: loadFeed,
      staleTime: Infinity,
    })
    return (
      <QuackList
        quacks={data ?? []}
        currentUserId="me"
      />
    )
  }

  render(
    <QueryClientProvider client={queryClient}>
      <Feed />
    </QueryClientProvider>,
  )
}

const articleWith = (text: string) => screen.getByText(text).closest("article")!

describe("Deleting a quack", () => {
  beforeEach(() => {
    vi.mocked(deleteQuack).mockReset()
    vi.mocked(toast.error).mockReset()
  })

  it("offers the delete action on my quacks only", () => {
    renderFeed([mine, theirs])

    expect(
      within(articleWith("my quack")).getByRole("button", { name: "Delete quack" }),
    ).toBeInTheDocument()
    expect(within(articleWith("their quack")).queryByRole("button")).not.toBeInTheDocument()
  })

  it("asks for confirmation and keeps the quack when cancelled", async () => {
    renderFeed([mine])

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
    const dialog = screen.getByRole("alertdialog")
    expect(within(dialog).getByText("Delete this quack?")).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))

    expect(deleteQuack).not.toHaveBeenCalled()
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(screen.getByText("my quack")).toBeInTheDocument()
  })

  it("removes the quack from the feed once confirmed", async () => {
    vi.mocked(deleteQuack).mockResolvedValue()
    renderFeed([mine, theirs], [theirs])

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }),
    )

    expect(vi.mocked(deleteQuack).mock.calls[0]?.[0]).toBe("q1")
    await waitFor(() => expect(screen.queryByText("my quack")).not.toBeInTheDocument())
    expect(screen.getByText("their quack")).toBeInTheDocument()
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("keeps the quack and explains when the delete fails", async () => {
    vi.mocked(deleteQuack).mockRejectedValue(new Error("Network down"))
    renderFeed([mine])

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }),
    )

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't delete the quack", {
        description: "Network down",
      }),
    )
    expect(screen.getByText("my quack")).toBeInTheDocument()
    // The dialog stays open so the user can try again.
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })
})
