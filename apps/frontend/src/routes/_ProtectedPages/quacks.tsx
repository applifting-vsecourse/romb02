import { useCallback, useRef } from "react"
import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { Seo } from "@/components/Seo"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useSession } from "@/features/auth/hooks/useSession"
import { canModerate } from "@/features/auth/lib/roles"
import { profileQueryOptions } from "@/features/profile/api/profileQueryOptions"
import { quackAuthorFilterSchema } from "@/features/quack/api/quackSchemas"
import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"
import { QuackForm } from "@/features/quack/components/QuackForm"
import { QuackList } from "@/features/quack/components/QuackList"
import { QuackSearch } from "@/features/quack/components/QuackSearch"
import { toSearchQuery } from "@/features/quack/lib/searchQuery"

const quacksSearchParamsSchema = z.object({
  q: z.string().optional().catch(undefined),
  author: quackAuthorFilterSchema.optional().catch(undefined),
})

const FEED_TABS = ["all", "mine"] as const
type FeedTab = (typeof FEED_TABS)[number]
const feedTabLabels: Record<FeedTab, string> = { all: "All", mine: "Mine" }
const isFeedTab = (value: string): value is FeedTab => FEED_TABS.some((tab) => tab === value)

export const Route = createFileRoute("/_ProtectedPages/quacks")({
  // The post form starts with the author's default mood, so it needs the
  // profile before it renders.
  validateSearch: quacksSearchParamsSchema,
  component: QuacksPage,
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQueryOptions()),
})

function QuacksPage() {
  const { q, author } = Route.useSearch()
  // A hand-edited URL (?q=a, ?q=   ) shouldn't produce a 400 — treat it as no search.
  const searchQuery = toSearchQuery(q)
  const navigate = Route.useNavigate()
  const quacksQuery = useQuery(quacksQueryOptions({ q: searchQuery, author }))
  const { data: profile } = useSuspenseQuery(profileQueryOptions())
  const { user } = useSession()
  const textRef = useRef<HTMLTextAreaElement>(null)
  const tab: FeedTab = author === "me" ? "mine" : "all"

  // Replace rather than push, so typing doesn't fill the history with one
  // entry per keystroke.
  const setSearchQuery = useCallback(
    (next: string | undefined) =>
      void navigate({ search: (prev) => ({ ...prev, q: next }), replace: true }),
    [navigate],
  )

  const setTab = (next: string) => {
    if (!isFeedTab(next)) return
    void navigate({ search: (prev) => ({ ...prev, author: next === "mine" ? "me" : undefined }) })
  }

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <QuackForm
          defaultMood={profile.defaultMood ?? undefined}
          textRef={textRef}
          className="mb-6"
        />

        <QuackSearch
          query={searchQuery}
          onQueryChange={setSearchQuery}
          className="mb-4"
        />

        <Tabs
          value={tab}
          onValueChange={setTab}
        >
          <TabsList aria-label="Show quacks by">
            {FEED_TABS.map((value) => (
              <TabsTrigger
                key={value}
                value={value}
              >
                {feedTabLabels[value]}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Radix only mounts the active tab's content, so this is one list. */}
          {FEED_TABS.map((value) => (
            <TabsContent
              key={value}
              value={value}
            >
              <QuackList
                quacks={quacksQuery.data ?? []}
                isLoading={quacksQuery.isLoading}
                error={quacksQuery.error ?? undefined}
                // Only the error state offers a retry — posting invalidates the list,
                // and refocusing the tab refetches it.
                onReload={() => void quacksQuery.refetch()}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery(undefined)}
                currentUserId={user?.id}
                canModerate={canModerate(user?.role)}
                isOnlyMine={value === "mine"}
                onWriteFirst={() => textRef.current?.focus()}
              />
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </>
  )
}
