import type { ComponentProps } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { moodLabels, MOODS, type Mood } from "@/lib/mood"
import { cn } from "@/lib/utils"

// Radix Select can't hold an empty-string value, so "no mood" gets a sentinel
// that is translated back to `undefined` before it reaches the caller.
const NO_MOOD = "none"

type MoodSelectProps = Omit<ComponentProps<typeof SelectTrigger>, "value" | "onChange"> & {
  value: Mood | undefined
  onValueChange: (mood: Mood | undefined) => void
  isDisabled?: boolean
}

// Remaining props land on the trigger, so a wrapping <FormControl> can wire up
// the label and error message the same way it does for a plain input.
export function MoodSelect({
  value,
  onValueChange,
  isDisabled,
  className,
  ...triggerProps
}: MoodSelectProps) {
  return (
    <Select
      value={value ?? NO_MOOD}
      onValueChange={(next) => onValueChange(next === NO_MOOD ? undefined : (next as Mood))}
      disabled={isDisabled}
    >
      <SelectTrigger
        {...triggerProps}
        className={cn("w-full", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_MOOD}>No mood</SelectItem>
        {MOODS.map((mood) => (
          <SelectItem
            key={mood}
            value={mood}
          >
            <span aria-hidden="true">{moodLabels[mood].emoji}</span>
            {moodLabels[mood].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
