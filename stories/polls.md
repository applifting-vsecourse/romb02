# Story: Polls on quacks

**As a** Quacker user, **I want to** ask a question with a few answers to pick from, **so that** I can see how people voted without counting replies by hand.

## Creating a poll

- A poll is an optional add-on to a quack. The quack text is the question. Mood still works as usual.
- The post form gets an "Add poll" toggle that shows answer fields:
  - 2 to 4 answers. Answer rows can be added or removed within those limits.
  - Each answer is required and up to 80 characters, with leading and trailing spaces trimmed.
  - Answers in one poll can't repeat, ignoring case.
- Deadline is a select: **No deadline** (default), 1 hour, 1 day, 3 days or 1 week. The server works out the close time when the quack is posted.
- These rules are checked in the form, with messages under each field, and again in the backend DTO.
- Polls can't be edited after posting, the same as quacks.

## Voting

- One vote per person per poll, enforced by the database. Everyone can vote, including the author.
- A voter can switch to a different answer as often as they like while the poll is open. A vote can't be taken back once cast.
- Voting feels instant: the pick and the counts update on click. If the server rejects the vote, both roll back and a toast says "Your vote didn't go through" with a **Retry** button.
- Once the deadline passes, no more votes or switches are accepted. The server clock decides what counts as on time. A late vote gets an error, and the poll then shows as closed.

## Seeing results

- **Open poll:** counts are visible only after voting. The author always sees them. Before voting, the answers are shown as buttons.
- **Closed poll:** everyone sees the final counts, whether they voted or not.
- **Results view:** each answer shows a bar, a percentage and a count, with "N votes" in total. The viewer's own pick has a check mark. A poll with a deadline shows "Closes in …" while open and "Closed" after.
- Voters are anonymous. Nobody sees who picked what, only the counts.
- Counts are left out of the API response for people who aren't allowed to see them yet, not just hidden in the UI.
- **Correctness:** counts always come from the server. They update after the viewer's own vote, and through the feed's existing refresh when the tab regains focus. No live updates.

## Out of scope

Live updates, voter lists, picking more than one answer, closing a poll by hand, editing polls, and searching answers. Search keeps matching quack text only.

## Acceptance criteria

1. A user can post a quack with a poll of 2–4 unique answers (up to 80 characters each) and an optional preset deadline. Invalid input is rejected on both the client and the server.
2. Voting twice from one account never adds up to two votes, including two requests at the same moment.
3. Switching a vote moves the user's one vote, and the totals stay the same.
4. Counts are hidden from people who haven't voted until the poll closes, both in the UI and in the API. The author always sees them.
5. A vote or switch after the deadline is rejected.
6. A failed vote rolls back on screen and shows a toast with Retry.
7. Loading, empty and error states, plus the design rules in `DESIGN.md`, apply to everything the poll touches.
