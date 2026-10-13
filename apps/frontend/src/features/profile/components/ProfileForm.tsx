import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { MoodSelect } from "@/components/MoodSelect"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { HTTPError } from "@/lib/api-client"
import { MOODS } from "@/lib/mood"
import { cn } from "@/lib/utils"

import {
  BIO_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
  type Profile,
} from "@/features/profile/api/profileSchemas"
import { useUpdateProfile } from "@/features/profile/hooks/useUpdateProfile"

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(USERNAME_MIN_LENGTH, `Use at least ${USERNAME_MIN_LENGTH} characters`)
    .max(USERNAME_MAX_LENGTH, `Keep it to ${USERNAME_MAX_LENGTH} characters or fewer`)
    .regex(USERNAME_PATTERN, "Use only letters, numbers, dots and underscores"),
  name: z.string().trim().min(1, "Display name is required"),
  bio: z.string().trim().max(BIO_MAX_LENGTH, `Keep it to ${BIO_MAX_LENGTH} characters or fewer`),
  defaultMood: z.enum(MOODS).optional(),
})

type FormValues = z.infer<typeof schema>

const toFormValues = (profile: Profile): FormValues => ({
  username: profile.username,
  name: profile.name,
  bio: profile.bio ?? "",
  defaultMood: profile.defaultMood ?? undefined,
})

type ProfileFormProps = { profile: Profile }

export function ProfileForm({ profile }: ProfileFormProps) {
  const updateProfile = useUpdateProfile()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(profile),
  })

  const bio = useWatch({ control: form.control, name: "bio" })
  const bioLength = bio?.length ?? 0

  const handleSubmit = (values: FormValues) => {
    updateProfile.mutate(
      {
        username: values.username,
        name: values.name,
        bio: values.bio || null,
        defaultMood: values.defaultMood ?? null,
      },
      {
        onSuccess: (saved) => {
          // What was just saved becomes what "Discard changes" returns to.
          form.reset(toFormValues(saved))
          toast.success("Your settings are saved")
        },
        onError: (error) => {
          // Keep what they typed and say so next to the field itself.
          if (error instanceof HTTPError && error.response.status === 409) {
            form.setError("username", { message: error.message }, { shouldFocus: true })
          }
        },
      },
    )
  }

  const isUsernameConflict =
    updateProfile.error instanceof HTTPError && updateProfile.error.response.status === 409

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-6"
      >
        {updateProfile.error && !isUsernameConflict ? (
          <Alert variant="destructive">
            <AlertDescription>{updateProfile.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {USERNAME_MIN_LENGTH}–{USERNAME_MAX_LENGTH} characters: letters, numbers, dots and
                underscores.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="e.g. Runs on espresso and pond water."
                  {...field}
                />
              </FormControl>
              <div className="flex items-start justify-between gap-3">
                <FormDescription>Optional.</FormDescription>
                <span
                  className={cn(
                    "text-sm",
                    bioLength > BIO_MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {bioLength}/{BIO_MAX_LENGTH}
                </span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <FormField
          control={form.control}
          name="defaultMood"
          render={({ field }) => (
            <FormItem className="sm:w-48">
              <FormLabel>Default mood</FormLabel>
              <FormControl>
                <MoodSelect
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              </FormControl>
              <FormDescription>New quacks start with this mood.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              updateProfile.reset()
              form.reset()
            }}
            disabled={!form.formState.isDirty || updateProfile.isPending}
          >
            Discard changes
          </Button>
          <Button
            type="submit"
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </form>
    </Form>
  )
}
