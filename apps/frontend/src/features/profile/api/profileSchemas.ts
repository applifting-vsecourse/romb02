import { z } from "zod"

import { MOODS } from "@/lib/mood"

// Mirrors the backend's username rules (and better-auth's own, which it
// copies) so the user is told before the request is made.
export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 30
export const USERNAME_PATTERN = /^[a-zA-Z0-9._]+$/

export const BIO_MAX_LENGTH = 160

export const profileSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  bio: z.string().nullable(),
  defaultMood: z.enum(MOODS).nullable(),
})

export type Profile = z.infer<typeof profileSchema>

export type ProfileUpdate = Omit<Profile, "id">
