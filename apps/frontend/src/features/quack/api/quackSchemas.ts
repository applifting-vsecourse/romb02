import { z } from "zod"

import { MOODS } from "@/lib/mood"

// Per the Applifting frontend playbook: validate every server payload with zod
// and infer types from the schema rather than auto-generating them.
// A quack without a mood comes back as null.
export const moodSchema = z.enum(MOODS)

export const quackUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
})

// Counts are only sent to voters, the author, and everyone once the poll has
// closed — otherwise `votes` and `totalVotes` are absent, not zero.
export const pollOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  votes: z.number().optional(),
})

export const pollSchema = z.object({
  id: z.string(),
  closesAt: z.coerce.date().nullable(),
  closed: z.boolean(),
  myOptionId: z.string().nullable(),
  resultsVisible: z.boolean(),
  totalVotes: z.number().optional(),
  options: z.array(pollOptionSchema),
})

export const quackSchema = z.object({
  id: z.string(),
  text: z.string(),
  mood: moodSchema.nullable(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  user: quackUserSchema,
  poll: pollSchema.nullable(),
})

export const quacksSchema = z.array(quackSchema)

export type Mood = z.infer<typeof moodSchema>
export type Quack = z.infer<typeof quackSchema>
export type Poll = z.infer<typeof pollSchema>
