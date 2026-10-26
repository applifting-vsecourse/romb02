import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema, type QuackAuthorFilter } from "@/features/quack/api/quackSchemas"

export const quacksQueryOptions = ({
  q,
  author,
}: { q?: string; author?: QuackAuthorFilter } = {}) =>
  queryOptions({
    queryKey: quackKeys.list({ q, author }),
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (q) searchParams.set("q", q)
      if (author) searchParams.set("author", author)
      return quacksSchema.parse(await api.get("quacks", { searchParams }).json())
    },
    // Keep showing the previous results while the next search loads, so the
    // list doesn't flash empty on every keystroke — but not across the All/Mine
    // tabs, where they would show other people's quacks under "Mine".
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2].author === author ? previous : undefined,
  })
