export const quackKeys = {
  all: () => ["quacks"] as const,
  lists: () => [...quackKeys.all(), "list"] as const,
  list: (search: { q?: string }) => [...quackKeys.lists(), search] as const,
}
