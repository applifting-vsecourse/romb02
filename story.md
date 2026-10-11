# Search the quack feed

**As a** signed-in user
**I want to** type a word or an author's name and see only the quacks that match
**So that** I can find a quack I saw earlier without scrolling the whole feed

## Acceptance criteria

### Matching

1. A quack matches if its **text**, its **author's display name** or its **author's @username** contains the search term.
2. Matching is **case-insensitive substring**: `duck` matches "Duckling" and "rubber DUCK".
3. A query with several words matches quacks that contain **every word, in any order**, across text and author. For example, `duck alice` finds Alice's quacks that mention ducks.
4. Results stay in the normal feed order, newest first.

### Input rules

5. The query is trimmed. Searching starts at **2 or more characters**. Below that, the full feed shows. The minimum applies to the whole trimmed query, not to each word: in `a duck`, the `a` still counts as a word that has to match.
6. Queries are capped at **100 characters**. The input won't accept more, and the API rejects longer ones with 400.

### UI

7. A search input sits **above the existing feed**. Matching filters the feed in place, and there is no separate page.
8. The search runs **as you type**, debounced by about 300ms.
9. The search term is kept in the URL (`/quacks?q=duck`), so refresh, the back button and shared links all keep it.
10. Clearing the input brings back the full feed and removes `q` from the URL.
11. When nothing matches, the feed shows _No quacks match "xyz"_ with a **Clear search** button.
12. Matches are **not highlighted**. Results look like normal feed items.
13. The post form stays visible and works as usual. A new quack that doesn't match the active search doesn't appear in the filtered list, and that's expected.
14. While the next search loads, the previous results stay visible so the list doesn't flash.

### API

15. `GET /api/quacks` accepts an optional `q` query param, validated by a DTO (trimmed, 2–100 chars). Filtering happens in Postgres. Without `q`, the endpoint behaves exactly as it does today.
16. The param is documented in Swagger.

## Out of scope

- Measuring usage (analytics or search logging). This will be a follow-up story.
- Full-text search, stemming, ranking and fuzzy matching
- Highlighting matches
- Searching by mood
- Pagination

## Notes for implementation

- Follow the quack pattern: the DTO gets `q`, then the service, then the repository's `findMany` gets a `where` that ANDs one condition per word, each an OR of `text` / `user.name` / `user.username` with `contains` and `mode: 'insensitive'`.
- Frontend: a TanStack Router search param, with `q` included in the query key.
- The search input comes from the shadcn kit, with no shadow (per `DESIGN.md`).
