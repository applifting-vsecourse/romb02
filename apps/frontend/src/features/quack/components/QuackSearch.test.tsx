import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { QuackSearch } from "@/features/quack/components/QuackSearch"

const type = (value: string) =>
  fireEvent.change(screen.getByLabelText("Search quacks"), { target: { value } })

const waitMs = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms)
  })

describe("QuackSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("applies the trimmed search once typing pauses", () => {
    const onQueryChange = vi.fn()
    render(<QuackSearch onQueryChange={onQueryChange} />)

    type("  duck ")
    waitMs(299)
    expect(onQueryChange).not.toHaveBeenCalled()

    waitMs(1)
    expect(onQueryChange).toHaveBeenCalledExactlyOnceWith("duck")
  })

  it("doesn't search for a single character", () => {
    const onQueryChange = vi.fn()
    render(<QuackSearch onQueryChange={onQueryChange} />)

    type("d")
    waitMs(300)
    expect(onQueryChange).not.toHaveBeenCalled()
  })

  it("goes back to the full feed when the input is cleared", () => {
    const onQueryChange = vi.fn()
    render(
      <QuackSearch
        query="duck"
        onQueryChange={onQueryChange}
      />,
    )

    type("")
    waitMs(300)
    expect(onQueryChange).toHaveBeenCalledExactlyOnceWith(undefined)
  })

  it("follows the search when it is cleared from outside", () => {
    const { rerender } = render(
      <QuackSearch
        query="duck"
        onQueryChange={vi.fn()}
      />,
    )
    expect(screen.getByLabelText("Search quacks")).toHaveValue("duck")

    rerender(<QuackSearch onQueryChange={vi.fn()} />)
    expect(screen.getByLabelText("Search quacks")).toHaveValue("")
  })

  it("caps the input at 100 characters", () => {
    render(<QuackSearch onQueryChange={vi.fn()} />)

    expect(screen.getByLabelText("Search quacks")).toHaveAttribute("maxLength", "100")
  })
})
