import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema } from "@/features/quack/api/quackSchemas"

export const quacksQueryOptions = ({ q }: { q?: string } = {}) =>
  queryOptions({
    queryKey: quackKeys.list({ q }),
    queryFn: async () =>
      quacksSchema.parse(await api.get("quacks", { searchParams: q ? { q } : undefined }).json()),
    // Keep showing the previous results while the next search loads, so the
    // list doesn't flash empty on every keystroke.
    placeholderData: keepPreviousData,
  })
