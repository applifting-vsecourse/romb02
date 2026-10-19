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

  describe("poll", () => {
    it("posts a plain quack from the Quack tab", async () => {
      renderForm()

      expect(screen.queryByLabelText("Answer 1")).not.toBeInTheDocument()
      await userEvent.type(screen.getByLabelText("New quack"), "no poll here")
      await userEvent.click(screen.getByRole("button", { name: "Quack" }))

      await waitFor(() => expect(addQuack).toHaveBeenCalled())
      expect(vi.mocked(addQuack).mock.calls[0]?.[0].poll).toBeUndefined()
    })

    it("posts trimmed answers and the chosen deadline", async () => {
      renderForm()

      await userEvent.type(screen.getByLabelText("New quack"), "Lunch?")
      await userEvent.click(screen.getByRole("tab", { name: "Poll" }))
      await userEvent.type(screen.getByLabelText("Answer 1"), "  Pho ")
      await userEvent.type(screen.getByLabelText("Answer 2"), "Pizza")
      await userEvent.click(screen.getByRole("button", { name: "Add answer" }))
      await userEvent.type(screen.getByLabelText("Answer 3"), "Tacos")
      await userEvent.click(screen.getByRole("combobox", { name: "Closes" }))
      await userEvent.click(screen.getByRole("option", { name: "In 1 hour" }))
      await userEvent.click(screen.getByRole("button", { name: "Quack" }))

      await waitFor(() => expect(addQuack).toHaveBeenCalled())
      expect(vi.mocked(addQuack).mock.calls[0]?.[0]).toEqual({
        text: "Lunch?",
        mood: undefined,
        poll: { options: ["Pho", "Pizza", "Tacos"], duration: "1h" },
      })
    })

    it("labels the text as the question and returns to the Quack tab after posting", async () => {
      vi.mocked(addQuack).mockResolvedValue({} as Awaited<ReturnType<typeof addQuack>>)
      renderForm()

      await userEvent.click(screen.getByRole("tab", { name: "Poll" }))
      await userEvent.type(screen.getByLabelText("Question"), "Lunch?")
      await userEvent.type(screen.getByLabelText("Answer 1"), "Pho")
      await userEvent.type(screen.getByLabelText("Answer 2"), "Pizza")
      await userEvent.click(screen.getByRole("button", { name: "Quack" }))

      await waitFor(() =>
        expect(screen.getByRole("tab", { name: "Quack" })).toHaveAttribute("aria-selected", "true"),
      )
      expect(screen.getByLabelText("New quack")).toHaveValue("")
    })

    it("posts no deadline by default", async () => {
      renderForm()

      await userEvent.type(screen.getByLabelText("New quack"), "Lunch?")
      await userEvent.click(screen.getByRole("tab", { name: "Poll" }))
      expect(screen.getByRole("combobox", { name: "Closes" })).toHaveTextContent("No deadline")
      await userEvent.type(screen.getByLabelText("Answer 1"), "Pho")
      await userEvent.type(screen.getByLabelText("Answer 2"), "Pizza")
      await userEvent.click(screen.getByRole("button", { name: "Quack" }))

      await waitFor(() => expect(addQuack).toHaveBeenCalled())
      expect(vi.mocked(addQuack).mock.calls[0]?.[0].poll).toEqual({
        options: ["Pho", "Pizza"],
        duration: undefined,
      })
    })

    it("allows 2 to 4 answers", async () => {
      renderForm()

      await userEvent.click(screen.getByRole("tab", { name: "Poll" }))
      expect(screen.queryByRole("button", { name: /Remove answer/ })).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole("button", { name: "Add answer" }))
      await userEvent.click(screen.getByRole("button", { name: "Add answer" }))
      expect(screen.getByLabelText("Answer 4")).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Add answer" })).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole("button", { name: "Remove answer 4" }))
      await userEvent.click(screen.getByRole("button", { name: "Remove answer 3" }))
      expect(screen.queryByLabelText("Answer 3")).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /Remove answer/ })).not.toBeInTheDocument()
    })

    it("explains blank, too long and repeated answers under the field", async () => {
      renderForm()

      await userEvent.type(screen.getByLabelText("New quack"), "Lunch?")
      await userEvent.click(screen.getByRole("tab", { name: "Poll" }))
      await userEvent.type(screen.getByLabelText("Answer 1"), "Pizza")
      await userEvent.type(screen.getByLabelText("Answer 2"), " pizza")
      await userEvent.click(screen.getByRole("button", { name: "Add answer" }))
      await userEvent.click(screen.getByRole("button", { name: "Add answer" }))
      await userEvent.click(screen.getByLabelText("Answer 4"))
      await userEvent.paste("a".repeat(81))
      await userEvent.click(screen.getByRole("button", { name: "Quack" }))

      expect(await screen.findByText("This answer is already in the poll")).toBeInTheDocument()
      expect(screen.getByText("Write an answer")).toBeInTheDocument()
      expect(screen.getByText("Keep it under 80 characters")).toBeInTheDocument()
      expect(addQuack).not.toHaveBeenCalled()
    })

    it("keeps the text but drops the answers when going back to the Quack tab", async () => {
      renderForm()

      await userEvent.click(screen.getByRole("tab", { name: "Poll" }))
      await userEvent.type(screen.getByLabelText("Question"), "never mind")
      await userEvent.type(screen.getByLabelText("Answer 1"), "half an answer")
      await userEvent.click(screen.getByRole("tab", { name: "Quack" }))
      expect(screen.getByLabelText("New quack")).toHaveValue("never mind")
      await userEvent.click(screen.getByRole("button", { name: "Quack" }))

      await waitFor(() => expect(addQuack).toHaveBeenCalled())
      expect(vi.mocked(addQuack).mock.calls[0]?.[0].poll).toBeUndefined()
    })
  })
})
