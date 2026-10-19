import { api } from "@/lib/api-client"

import { quackSchema, type Mood, type Quack } from "@/features/quack/api/quackSchemas"
import type { PollDuration } from "@/features/quack/lib/poll"

export type AddQuackInput = {
  text: string
  mood?: Mood
  poll?: { options: string[]; duration?: PollDuration }
}

export async function addQuack(input: AddQuackInput): Promise<Quack> {
  const json = await api.post("quacks", { json: input }).json()
  return quackSchema.parse(json)
}
