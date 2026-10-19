import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { addQuack } from "@/features/quack/api/addQuack"
import { QuackForm } from "@/features/quack/components/QuackForm"

vi.mock("@/features/quack/api/addQuack", () => ({ addQuack: vi.fn() }))

// jsdom lacks the pointer-capture and scrolling APIs Radix Select calls.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

const renderForm = (props: Parameters<typeof QuackForm>[0] = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <QuackForm {...props} />
    </QueryClientProvider>,
  )

describe("QuackForm", () => {
  beforeEach(() => {
    vi.mocked(addQuack).mockReset()
  })

  it("posts the chosen mood with the text", async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText("New quack"), "bread is back")
    await userEvent.click(screen.getByRole("combobox", { name: "Mood" }))
    await userEvent.click(screen.getByRole("option", { name: /Happy/ }))
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    await waitFor(() => expect(addQuack).toHaveBeenCalled())
    expect(vi.mocked(addQuack).mock.calls[0]?.[0]).toEqual({ text: "bread is back", mood: "happy" })
  })

  it("posts without a mood when none is chosen", async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText("New quack"), "just a quack")
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    await waitFor(() => expect(addQuack).toHaveBeenCalled())
    expect(vi.mocked(addQuack).mock.calls[0]?.[0]).toEqual({
      text: "just a quack",
      mood: undefined,
    })
  })

  it("starts with the author's default mood and returns to it after posting", async () => {
    vi.mocked(addQuack).mockResolvedValue({} as Awaited<ReturnType<typeof addQuack>>)
    renderForm({ defaultMood: "silly" })

    const mood = screen.getByRole("combobox", { name: "Mood" })
    expect(mood).toHaveTextContent("Silly")

    await userEvent.click(mood)
    await userEvent.click(screen.getByRole("option", { name: /Sad/ }))
    await userEvent.type(screen.getByLabelText("New quack"), "rain again")
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    await waitFor(() => expect(addQuack).toHaveBeenCalled())
    expect(vi.mocked(addQuack).mock.calls[0]?.[0]).toEqual({ text: "rain again", mood: "sad" })
    await waitFor(() => expect(mood).toHaveTextContent("Silly"))
  })
})
