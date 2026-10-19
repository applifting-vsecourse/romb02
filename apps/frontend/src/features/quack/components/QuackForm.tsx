import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus, X } from "lucide-react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { MoodSelect } from "@/components/MoodSelect"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { MOODS, type Mood } from "@/lib/mood"
import { cn } from "@/lib/utils"

import { useAddQuack } from "@/features/quack/hooks/useAddQuack"
import {
  POLL_DURATIONS,
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  POLL_OPTION_MAX_LENGTH,
  pollDurationLabels,
} from "@/features/quack/lib/poll"

// Mirrors the server-side DTO (MaxLength(280)) so the user is told before
// the request is made — the server still validates independently.
const MAX_LENGTH = 280

// Radix Select can't hold an empty-string value, so "no deadline" gets a
// sentinel that is translated back to `undefined` before it reaches the API.
const NO_DEADLINE = "none"

const schema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, "Write something first")
      .max(MAX_LENGTH, `Keep it under ${MAX_LENGTH} characters`),
    mood: z.enum(MOODS).optional(),
    // A poll is a quack whose text is the question, so both kinds share the
    // text and mood fields.
    kind: z.enum(["quack", "poll"]),
    // react-hook-form's field arrays need objects, hence `{ value }`.
    pollOptions: z.array(z.object({ value: z.string() })),
    pollDuration: z.enum([NO_DEADLINE, ...POLL_DURATIONS]),
  })
  .superRefine((values, ctx) => {
    // The answers only count when a poll is attached.
    if (values.kind !== "poll") return

    const seen = new Set<string>()
    values.pollOptions.forEach(({ value }, index) => {
      const answer = value.trim()
      const path = ["pollOptions", index, "value"]
      if (answer.length === 0) {
        ctx.addIssue({ code: "custom", path, message: "Write an answer" })
      } else if (answer.length > POLL_OPTION_MAX_LENGTH) {
        ctx.addIssue({
          code: "custom",
          path,
          message: `Keep it under ${POLL_OPTION_MAX_LENGTH} characters`,
        })
      } else if (seen.has(answer.toLowerCase())) {
        ctx.addIssue({ code: "custom", path, message: "This answer is already in the poll" })
      }
      seen.add(answer.toLowerCase())
    })
  })

type FormValues = z.infer<typeof schema>

const emptyPollOptions = () => Array.from({ length: POLL_MIN_OPTIONS }, () => ({ value: "" }))

type QuackFormProps = {
  // The author's chosen default from their settings — the form starts with it
  // and returns to it after each post.
  defaultMood?: Mood
  className?: string
}

export function QuackForm({ defaultMood, className }: QuackFormProps) {
  const addQuack = useAddQuack()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      text: "",
      mood: defaultMood,
      kind: "quack",
      pollOptions: emptyPollOptions(),
      pollDuration: NO_DEADLINE,
    },
  })
  const pollOptions = useFieldArray({ control: form.control, name: "pollOptions" })

  const text = useWatch({ control: form.control, name: "text" })
  const kind = useWatch({ control: form.control, name: "kind" })
  const length = text?.length ?? 0

  const handleSubmit = (values: FormValues) => {
    addQuack.mutate(
      {
        text: values.text,
        mood: values.mood,
        poll:
          values.kind === "poll"
            ? {
                options: values.pollOptions.map(({ value }) => value.trim()),
                duration: values.pollDuration === NO_DEADLINE ? undefined : values.pollDuration,
              }
            : undefined,
      },
      { onSuccess: () => form.reset() },
    )
  }

  // Both tabs render the same text and mood fields — only the label changes.
  // Radix unmounts the inactive tab, and react-hook-form keeps the values, so
  // what was typed survives switching tabs.
  const renderTextAndMood = (textLabel: string, textPlaceholder: string) => (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <FormField
        control={form.control}
        name="text"
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormLabel>{textLabel}</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder={textPlaceholder}
                disabled={addQuack.isPending}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="mood"
        render={({ field }) => (
          <FormItem className="sm:w-36">
            <FormLabel>Mood</FormLabel>
            <FormControl>
              <MoodSelect
                ref={field.ref}
                onBlur={field.onBlur}
                value={field.value}
                onValueChange={field.onChange}
                isDisabled={addQuack.isPending}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-3", className)}
      >
        {addQuack.error ? (
          <Alert variant="destructive">
            <AlertDescription>{addQuack.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs
          value={kind}
          onValueChange={(next) => form.setValue("kind", next === "poll" ? "poll" : "quack")}
        >
          <TabsList aria-label="What to post">
            <TabsTrigger
              value="quack"
              disabled={addQuack.isPending}
            >
              Quack
            </TabsTrigger>
            <TabsTrigger
              value="poll"
              disabled={addQuack.isPending}
            >
              Poll
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quack">
            {renderTextAndMood("New quack", "Quack something...")}
          </TabsContent>

          <TabsContent
            value="poll"
            className="flex flex-col gap-3"
          >
            {renderTextAndMood("Question", "Where should we go for lunch?")}
            <div className="flex flex-col gap-3">
              {pollOptions.fields.map((option, index) => (
                <FormField
                  key={option.id}
                  control={form.control}
                  name={`pollOptions.${index}.value`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Answer {index + 1}</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            placeholder={index === 0 ? "Pho" : index === 1 ? "Pizza" : undefined}
                            disabled={addQuack.isPending}
                            {...field}
                          />
                        </FormControl>
                        {pollOptions.fields.length > POLL_MIN_OPTIONS ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove answer ${index + 1}`}
                            disabled={addQuack.isPending}
                            onClick={() => pollOptions.remove(index)}
                          >
                            <X className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                {pollOptions.fields.length < POLL_MAX_OPTIONS ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={addQuack.isPending}
                    onClick={() => pollOptions.append({ value: "" })}
                  >
                    <Plus className="size-4" />
                    Add answer
                  </Button>
                ) : (
                  <span />
                )}

                <FormField
                  control={form.control}
                  name="pollDuration"
                  render={({ field }) => (
                    <FormItem className="sm:w-40">
                      <FormLabel>Closes</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={addQuack.isPending}
                      >
                        <FormControl>
                          <SelectTrigger
                            ref={field.ref}
                            onBlur={field.onBlur}
                            className="w-full"
                          >
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_DEADLINE}>No deadline</SelectItem>
                          {POLL_DURATIONS.map((duration) => (
                            <SelectItem
                              key={duration}
                              value={duration}
                            >
                              {pollDurationLabels[duration]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-3">
          <span
            className={cn(
              "text-sm",
              length > MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {length}/{MAX_LENGTH}
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={addQuack.isPending}
          >
            {addQuack.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Quack
          </Button>
        </div>
      </form>
    </Form>
  )
}
