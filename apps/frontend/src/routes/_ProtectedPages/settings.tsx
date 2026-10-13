import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { profileQueryOptions } from "@/features/profile/api/profileQueryOptions"
import { ProfileForm } from "@/features/profile/components/ProfileForm"

export const Route = createFileRoute("/_ProtectedPages/settings")({
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQueryOptions()),
  component: SettingsPage,
})

function SettingsPage() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions())

  return (
    <>
      <Seo title="Settings" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 mb-8 text-muted-foreground">How other ducks see you on Quacker.</p>
        <ProfileForm profile={profile} />
      </section>
    </>
  )
}
