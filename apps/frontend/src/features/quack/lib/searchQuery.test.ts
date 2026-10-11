import { describe, expect, it } from "vitest"

import { toSearchQuery } from "@/features/quack/lib/searchQuery"

describe("toSearchQuery", () => {
  it("trims the search", () => {
    expect(toSearchQuery("  rubber duck ")).toBe("rubber duck")
  })

  it("ignores searches shorter than 2 characters", () => {
    expect(toSearchQuery(undefined)).toBeUndefined()
    expect(toSearchQuery("   ")).toBeUndefined()
    expect(toSearchQuery(" d ")).toBeUndefined()
  })

  it("keeps single-character words inside a longer search", () => {
    expect(toSearchQuery("a duck")).toBe("a duck")
  })

  it("cuts a search longer than 100 characters", () => {
    expect(toSearchQuery("a".repeat(150))).toHaveLength(100)
  })
})
