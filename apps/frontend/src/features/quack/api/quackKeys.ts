import type { QuackAuthorFilter } from "@/features/quack/api/quackSchemas"

export const quackKeys = {
  all: () => ["quacks"] as const,
  lists: () => [...quackKeys.all(), "list"] as const,
  list: (filter: { q?: string; author?: QuackAuthorFilter }) =>
    [...quackKeys.lists(), filter] as const,
}
