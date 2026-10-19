import { Poll, toClosesAt, toPollView } from './poll';

const NOW = new Date('2026-01-01T12:00:00Z');

const aPoll = (overrides: Partial<Poll> = {}): Poll => ({
  id: 'p1',
  quackId: 'q1',
  authorId: 'author',
  closesAt: null,
  options: [
    { id: 'o1', text: 'Pho', votes: 3 },
    { id: 'o2', text: 'Pizza', votes: 1 },
  ],
  myOptionId: null,
  ...overrides,
});

describe('toPollView', () => {
  it('hides the counts from someone who has not voted on an open poll', () => {
    const view = toPollView(aPoll(), 'viewer', NOW);

    expect(view.resultsVisible).toBe(false);
    expect(view).not.toHaveProperty('totalVotes');
    expect(view.options).toEqual([
      { id: 'o1', text: 'Pho' },
      { id: 'o2', text: 'Pizza' },
    ]);
  });

  it('shows the counts to someone who has voted', () => {
    const view = toPollView(aPoll({ myOptionId: 'o2' }), 'viewer', NOW);

    expect(view.resultsVisible).toBe(true);
    expect(view.myOptionId).toBe('o2');
    expect(view.totalVotes).toBe(4);
    expect(view.options).toEqual([
      { id: 'o1', text: 'Pho', votes: 3 },
      { id: 'o2', text: 'Pizza', votes: 1 },
    ]);
  });

  it('always shows the counts to the author', () => {
    const view = toPollView(aPoll(), 'author', NOW);

    expect(view.resultsVisible).toBe(true);
    expect(view.totalVotes).toBe(4);
  });

  it('shows the counts to everyone once the poll has closed', () => {
    const view = toPollView(
      aPoll({ closesAt: new Date('2026-01-01T11:00:00Z') }),
      'viewer',
      NOW,
    );

    expect(view.closed).toBe(true);
    expect(view.resultsVisible).toBe(true);
    expect(view.totalVotes).toBe(4);
  });

  it('counts a poll as closed at the exact deadline', () => {
    expect(toPollView(aPoll({ closesAt: NOW }), 'viewer', NOW).closed).toBe(
      true,
    );
  });

  it('keeps a poll with a future deadline open', () => {
    const view = toPollView(
      aPoll({ closesAt: new Date('2026-01-01T13:00:00Z') }),
      'viewer',
      NOW,
    );

    expect(view.closed).toBe(false);
    expect(view.resultsVisible).toBe(false);
  });

  it('never closes a poll without a deadline', () => {
    expect(toPollView(aPoll(), 'viewer', NOW).closed).toBe(false);
  });
});

describe('toClosesAt', () => {
  it('has no deadline when no duration is picked', () => {
    expect(toClosesAt(undefined, NOW)).toBeNull();
  });

  it.each([
    ['1h', '2026-01-01T13:00:00.000Z'],
    ['1d', '2026-01-02T12:00:00.000Z'],
    ['3d', '2026-01-04T12:00:00.000Z'],
    ['1w', '2026-01-08T12:00:00.000Z'],
  ] as const)('closes %s from now', (duration, expected) => {
    expect(toClosesAt(duration, NOW)?.toISOString()).toBe(expected);
  });
});
