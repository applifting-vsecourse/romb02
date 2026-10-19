import { useCallback } from "react"
import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { Seo } from "@/components/Seo"

import { profileQueryOptions } from "@/features/profile/api/profileQueryOptions"
import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"
import { QuackForm } from "@/features/quack/components/QuackForm"
import { QuackList } from "@/features/quack/components/QuackList"
import { QuackSearch } from "@/features/quack/components/QuackSearch"
import { toSearchQuery } from "@/features/quack/lib/searchQuery"

const quacksSearchParamsSchema = z.object({
  q: z.string().optional().catch(undefined),
})

export const Route = createFileRoute("/_ProtectedPages/quacks")({
  // The post form starts with the author's default mood, so it needs the
  // profile before it renders.
  validateSearch: quacksSearchParamsSchema,
  component: QuacksPage,
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQueryOptions()),
})

function QuacksPage() {
  const { q } = Route.useSearch()
  // A hand-edited URL (?q=a, ?q=   ) shouldn't produce a 400 — treat it as no search.
  const searchQuery = toSearchQuery(q)
  const navigate = Route.useNavigate()
  const quacksQuery = useQuery(quacksQueryOptions({ q: searchQuery }))
  const { data: profile } = useSuspenseQuery(profileQueryOptions())

  // Replace rather than push, so typing doesn't fill the history with one
  // entry per keystroke.
  const setSearchQuery = useCallback(
    (next: string | undefined) => void navigate({ search: { q: next }, replace: true }),
    [navigate],
  )

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <QuackForm
          defaultMood={profile.defaultMood ?? undefined}
          className="mb-6"
        />

        <QuackSearch
          query={searchQuery}
          onQueryChange={setSearchQuery}
          className="mb-4"
        />

        <QuackList
          quacks={quacksQuery.data ?? []}
          isLoading={quacksQuery.isLoading}
          error={quacksQuery.error ?? undefined}
          // Only the error state offers a retry — posting invalidates the list,
          // and refocusing the tab refetches it.
          onReload={() => void quacksQuery.refetch()}
          searchQuery={searchQuery}
          onClearSearch={() => setSearchQuery(undefined)}
        />
      </section>
    </>
  )
}
