import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { HTTPError } from "@/lib/api-client"

import type { Profile } from "@/features/profile/api/profileSchemas"
import { updateProfile } from "@/features/profile/api/updateProfile"
import { ProfileForm } from "@/features/profile/components/ProfileForm"

vi.mock("@/features/profile/api/updateProfile", () => ({ updateProfile: vi.fn() }))
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

// jsdom lacks the pointer-capture and scrolling APIs Radix Select calls.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

const profile: Profile = {
  id: "u1",
  username: "CaffeinatedDuck",
  name: "Caffeinated Duck",
  bio: null,
  defaultMood: "happy",
}

const usernameTaken = () => {
  const error = new HTTPError(
    new Response(null, { status: 409 }),
    new Request("http://localhost/api/profile", { method: "PUT" }),
    {} as ConstructorParameters<typeof HTTPError>[2],
  )
  error.message = "That username is already taken"
  return error
}

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ProfileForm profile={profile} />
    </QueryClientProvider>,
  )

describe("ProfileForm", () => {
  beforeEach(() => {
    vi.mocked(updateProfile).mockReset()
    vi.mocked(toast.success).mockReset()
  })

  it("starts with the saved profile", () => {
    renderForm()

    expect(screen.getByLabelText("Username")).toHaveValue("CaffeinatedDuck")
    expect(screen.getByLabelText("Display name")).toHaveValue("Caffeinated Duck")
    expect(screen.getByLabelText("Bio")).toHaveValue("")
    expect(screen.getByRole("combobox", { name: "Default mood" })).toHaveTextContent("Happy")
  })

  it("saves every field and confirms", async () => {
    const saved = {
      ...profile,
      username: "espresso.duck",
      bio: "Runs on coffee.",
      defaultMood: null,
    }
    vi.mocked(updateProfile).mockResolvedValue(saved)
    renderForm()

    const username = screen.getByLabelText("Username")
    await userEvent.clear(username)
    await userEvent.type(username, "espresso.duck")
    await userEvent.type(screen.getByLabelText("Bio"), "Runs on coffee.")
    await userEvent.click(screen.getByRole("combobox", { name: "Default mood" }))
    await userEvent.click(screen.getByRole("option", { name: "No mood" }))
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    expect(vi.mocked(updateProfile).mock.calls[0]?.[0]).toEqual({
      username: "espresso.duck",
      name: "Caffeinated Duck",
      bio: "Runs on coffee.",
      defaultMood: null,
    })
  })

  it("sends no bio when the field is blank", async () => {
    vi.mocked(updateProfile).mockResolvedValue(profile)
    renderForm()

    await userEvent.type(screen.getByLabelText("Bio"), "   ")
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => expect(updateProfile).toHaveBeenCalled())
    expect(vi.mocked(updateProfile).mock.calls[0]?.[0]).toMatchObject({ bio: null })
  })

  it.each([
    ["ab", "Use at least 3 characters"],
    ["a".repeat(31), "Keep it to 30 characters or fewer"],
    ["duck-duck", "Use only letters, numbers, dots and underscores"],
  ])("rejects the username %p before sending it", async (value, message) => {
    renderForm()

    const username = screen.getByLabelText("Username")
    await userEvent.clear(username)
    await userEvent.type(username, value)
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it("requires a display name and limits the bio", async () => {
    renderForm()

    await userEvent.clear(screen.getByLabelText("Display name"))
    await userEvent.type(screen.getByLabelText("Bio"), "a".repeat(161))
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText("Display name is required")).toBeInTheDocument()
    expect(screen.getByText("Keep it to 160 characters or fewer")).toBeInTheDocument()
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it("says a taken username next to the field and keeps what was typed", async () => {
    vi.mocked(updateProfile).mockRejectedValue(usernameTaken())
    renderForm()

    const username = screen.getByLabelText("Username")
    await userEvent.clear(username)
    await userEvent.type(username, "BreadCritic")
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    const message = await screen.findByText("That username is already taken")
    expect(username).toHaveAttribute("aria-describedby", expect.stringContaining(message.id))
    expect(username).toHaveValue("BreadCritic")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("discards changes back to what is saved", async () => {
    renderForm()

    const username = screen.getByLabelText("Username")
    await userEvent.clear(username)
    await userEvent.type(username, "someone.else")
    await userEvent.type(screen.getByLabelText("Bio"), "draft")
    await userEvent.click(screen.getByRole("button", { name: "Discard changes" }))

    expect(username).toHaveValue("CaffeinatedDuck")
    expect(screen.getByLabelText("Bio")).toHaveValue("")
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it("discards back to the newly saved values after a save", async () => {
    vi.mocked(updateProfile).mockResolvedValue({ ...profile, username: "espresso.duck" })
    renderForm()

    const username = screen.getByLabelText("Username")
    await userEvent.clear(username)
    await userEvent.type(username, "espresso.duck")
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())

    await userEvent.type(username, "_draft")
    await userEvent.click(screen.getByRole("button", { name: "Discard changes" }))

    expect(username).toHaveValue("espresso.duck")
  })
})
