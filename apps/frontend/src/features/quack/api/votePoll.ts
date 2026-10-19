import { api } from "@/lib/api-client"

import { pollSchema, type Poll } from "@/features/quack/api/quackSchemas"

export type VotePollInput = { quackId: string; optionId: string }

// Sets the signed-in user's vote, replacing any earlier one.
export async function votePoll({ quackId, optionId }: VotePollInput): Promise<Poll> {
  const json = await api.put(`quacks/${quackId}/poll/vote`, { json: { optionId } }).json()
  return pollSchema.parse(json)
}
