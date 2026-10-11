// Mirrors the server-side DTO (MinLength(2), MaxLength(100)) — the server
// still validates independently.
export const SEARCH_MIN_LENGTH = 2
export const SEARCH_MAX_LENGTH = 100

// Turns whatever is in the input (or the URL) into the query the API accepts,
// or `undefined` when there is nothing worth searching for yet.
export function toSearchQuery(raw: string | undefined): string | undefined {
  const query = raw?.trim().slice(0, SEARCH_MAX_LENGTH).trim() ?? ""
  return query.length >= SEARCH_MIN_LENGTH ? query : undefined
}
