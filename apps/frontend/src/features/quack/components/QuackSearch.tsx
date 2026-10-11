import { useEffect, useId, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import { SEARCH_MAX_LENGTH, toSearchQuery } from "@/features/quack/lib/searchQuery"

const DEBOUNCE_MS = 300

type QuackSearchProps = {
  // The search currently applied (from the URL).
  query?: string
  onQueryChange: (query: string | undefined) => void
  className?: string
}

export function QuackSearch({ query, onQueryChange, className }: QuackSearchProps) {
  const id = useId()
  const [value, setValue] = useState(query ?? "")
  const [appliedQuery, setAppliedQuery] = useState(query)

  // The URL can change without the user typing (the "Clear search" button,
  // back/forward) — follow it, unless it already reflects what's typed.
  if (query !== appliedQuery) {
    setAppliedQuery(query)
    if (toSearchQuery(value) !== query) setValue(query ?? "")
  }

  useEffect(() => {
    const next = toSearchQuery(value)
    if (next === query) return
    const timeout = setTimeout(() => onQueryChange(next), DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [value, query, onQueryChange])

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>Search quacks</Label>
      <Input
        id={id}
        type="search"
        value={value}
        maxLength={SEARCH_MAX_LENGTH}
        placeholder="e.g. bread or @CaffeinatedDuck"
        autoComplete="off"
        onChange={(event) => setValue(event.target.value)}
      />
    </div>
  )
}
