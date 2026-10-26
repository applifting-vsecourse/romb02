import { api } from "@/lib/api-client"

// The server only deletes the quack if the signed-in user wrote it.
export async function deleteQuack(quackId: string): Promise<void> {
  await api.delete(`quacks/${quackId}`)
}
