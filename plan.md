# Plan: polls on quacks

Implements [`stories/polls.md`](stories/polls.md).

This follows the quack pattern: Prisma model → repository → service → DTO/controller → zod schema → query/mutation → components. Polls stay inside the **quack module** on both backend and frontend. A poll is created in the same request as its quack and comes back inside the quack payload, so a separate module would only add wiring between the two.

## Data model (`schema.prisma`)

```prisma
model Poll {
  id        String       @id @default(cuid())
  quack     Quack        @relation(fields: [quackId], references: [id], onDelete: Cascade)
  quackId   String       @unique
  closesAt  DateTime?    // null = no deadline
  createdAt DateTime     @default(now())
  options   PollOption[]
  votes     PollVote[]
  @@map("poll")
}

model PollOption {
  id       String     @id @default(cuid())
  poll     Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  pollId   String
  text     String     @db.VarChar(80)
  position Int        // display order, 0..3
  votes    PollVote[]
  @@unique([id, pollId])        // target for the composite FK below
  @@unique([pollId, position])
  @@map("poll_option")
}

model PollVote {
  id        String     @id @default(cuid())
  poll      Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  pollId    String
  option    PollOption @relation(fields: [optionId, pollId], references: [id, pollId], onDelete: Cascade)
  optionId  String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @default(now()) @updatedAt
  @@unique([pollId, userId])    // one person, one vote — enforced by Postgres
  @@index([optionId])
  @@map("poll_vote")
}
```

The database itself keeps the numbers right:

- **One vote each:** `@@unique([pollId, userId])` rules out a second vote from the same person, even when two requests arrive together.
- **Matching answer:** the composite foreign key `(optionId, pollId)` means a vote can only point at an answer that belongs to the same poll.
- **Counts:** always computed from the vote rows (`_count`), never stored as a separate number that could drift.
- **No vote removal:** "switch only" is just the absence of a delete endpoint, so nothing extra is needed.

## Endpoints

### `POST /api/quacks` (extended)

Takes an optional `poll`:

```json
{
  "text": "Lunch?",
  "mood": "happy",
  "poll": { "options": ["Pho", "Pizza"], "duration": "1h" }
}
```

- `options` is 2–4 strings. Each is trimmed, 1–80 characters, and unique ignoring case. A custom class-validator constraint handles the uniqueness check.
- `duration` is optional and is one of `1h | 1d | 3d | 1w`. Leaving it out means no deadline. The server sets `closesAt = now + duration`.
- The quack, poll and answers are written in one nested Prisma `create`, so they either all exist or none do.

### `GET /api/quacks` (extended)

Each quack gets `poll: PollView | null`:

```jsonc
{
  "id": "…",
  "closesAt": "…", // or null
  "closed": false,
  "myOptionId": "…", // or null
  "resultsVisible": true,
  "totalVotes": 7, // only when resultsVisible
  "options": [{ "id": "…", "text": "Pho", "votes": 4 }], // votes only when resultsVisible
}
```

- `resultsVisible = isAuthor || myOptionId != null || closed`. When it is false, `totalVotes` and `votes` are not sent at all.
- The list now depends on who is viewing, so the controller passes `@User()` into `getQuacks`.

### `PUT /api/quacks/:quackId/poll/vote` (new)

Body `{ "optionId": "…" }`. Returns the updated `PollView`.

- `PUT` because the request sets your vote to an answer, and sending the same vote twice gives the same result.
- Upsert on `(pollId, userId)`. Prisma turns this into a native `INSERT … ON CONFLICT DO UPDATE`, so concurrent requests can't create two rows.
- Error responses:
  - `404` if the quack or poll doesn't exist.
  - `400` if the answer isn't in this poll.
  - `409` once `closesAt <= now()` on the server.

The visibility and closed rules live in one pure domain function, `toPollView(poll, viewerId, now)`. Both GET and PUT use it, which also makes it the main thing to unit-test.

## Frontend

- **Schemas:** `quackSchemas.ts` gets a `pollSchema` with optional `votes`/`totalVotes`, plus `quack.poll: pollSchema.nullable()`.
- **Form:** `QuackForm` gets **Quack / Poll** tabs. Both tabs share the text and mood fields. The Poll tab relabels the text "Question" and adds 2–4 answer inputs with add/remove buttons and a deadline `Select` (default "No deadline"). The answer rules are mirrored in zod, and errors show under each field.
  - The tabs come from the kit: `pnpm dlx shadcn@latest add tabs`, with the active tab's `shadow-sm` stripped.
- **`QuackPoll` component:**
  - Before voting, answers are outline buttons.
  - After voting, the author's view, or once closed, it shows results: a bar, %, count, "N votes", a check on your pick, and "Closes in …" or "Closed".
  - Bars come from `pnpm dlx shadcn@latest add progress`.
- **`useVotePoll` mutation:**
  - `onMutate` cancels the quack queries and patches every cached list with `setQueriesData`, keeping a snapshot.
  - `onError` restores the snapshot and shows a sonner toast, "Your vote didn't go through", with a **Retry** action that runs the same vote again.
  - `onSettled` invalidates `quackKeys.all()`.

**First vote vs. switch.** Before you've voted, the client has no counts to update. A switch is updated instantly (−1 on the old answer, +1 on the new). On a first vote the pick shows instantly, and the bars render as a skeleton until the server replies. Counts are never sent to people who haven't voted just to make this instant.

## Verifying the database guarantees

The backend tests all use a mocked repository, and this feature doesn't add database-backed tests. The two guarantees that matter most come from Postgres constraints rather than application code, and the migration is what creates them. Unit tests cover the service logic: the closed check, answer/poll matching and the `409`/`400`/`404` responses. The constraints themselves are checked by hand, and the PR description carries these steps so a reviewer can repeat them against the running app:

1. **The constraints exist.** In `psql`, `\d poll_vote` shows the unique index `poll_vote_pollId_userId_key` on `("pollId", "userId")` and the foreign key `poll_vote_optionId_pollId_fkey` on `("optionId", "pollId")` → `poll_option(id, "pollId")`.
2. **One vote under concurrency.**
   - Sign in, copy the session cookie, and fire about 20 parallel `PUT /api/quacks/:quackId/poll/vote` requests at a seeded open poll, spread across its answers (for example `xargs -P 20 curl …`).
   - Every request returns `200`.
   - `SELECT count(*) FROM poll_vote WHERE "pollId" = … AND "userId" = …` returns `1`.
3. **Answer must belong to the poll.** A raw `INSERT INTO poll_vote` using an `"optionId"` from a different poll fails with a foreign-key violation.
4. **Closed poll.** A `PUT` against the seeded closed poll returns `409`, and the vote count doesn't change.

## Build order

Each step ends green on `pnpm check-all`.

1. **Schema and migration:** the three models above, `pnpm backend prisma:migrations:run`, and one or two seeded polls (one open, one closed) so the UI has data to work with.
2. **Domain:** `domain/poll.ts` with the types, the duration presets and `toPollView`, unit-tested for author, voter, non-voter and closed.
3. **Create:** the `CreatePollDto` and its spec (2–4 answers, trim, 80 characters, case-insensitive duplicates, duration enum), nested create in the repository, and a service spec.
4. **Read:** the repository includes options with `_count` and the viewer's own vote, the service maps through `toPollView`, and the response DTO and Swagger docs are updated.
5. **Vote:**
   - A repository upsert.
   - A service that checks the poll exists, the answer belongs to it and it isn't closed.
   - The new controller route.
   - A unit spec for each error case.
   - Run the manual checks above once and record the results in the PR description.
6. **Frontend read:** the zod schema and `QuackPoll` showing all of its states, with tests for hidden counts and the closed state.
7. **Frontend vote:** `useVotePoll` with the optimistic update, rollback and Retry toast, with tests for a switch, a first vote and a rollback on failure.
8. **Frontend create:** the poll section of `QuackForm`, with form tests.

The order puts reading before writing on the frontend, so the seeded polls can be checked before the form exists.
