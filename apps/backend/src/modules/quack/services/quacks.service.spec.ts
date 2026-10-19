// Example unit test — the pattern to copy for your own services.
// The repository is mocked, so the test exercises the service in isolation.
import { Poll } from '@/modules/quack/domain/poll';
import { Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { QuacksService } from './quacks.service';

const viewer = { id: 'u1' } as Identity;

const aQuack = (overrides: Partial<Quack> = {}): Quack => ({
  id: 'q1',
  text: 'quack quack',
  mood: null,
  userId: 'u1',
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  user: { id: 'u1', name: 'Caffeinated Duck', username: 'CaffeinatedDuck' },
  poll: null,
  ...overrides,
});

const aPoll = (overrides: Partial<Poll> = {}): Poll => ({
  id: 'p1',
  quackId: 'q1',
  authorId: 'author',
  closesAt: null,
  options: [
    { id: 'o1', text: 'Pho', votes: 2 },
    { id: 'o2', text: 'Pizza', votes: 1 },
  ],
  myOptionId: null,
  ...overrides,
});

describe('QuacksService', () => {
  it('returns quacks from the repository', async () => {
    const quacks = [aQuack()];
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue(quacks);

    const service = new QuacksService(repository);

    await expect(service.getQuacks(viewer)).resolves.toEqual(quacks);
    expect(repository.getQuacks).toHaveBeenCalledWith({
      viewerId: 'u1',
      searchTerms: [],
    });
  });

  it('splits a search into words that must all match', async () => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);

    const service = new QuacksService(repository);

    await service.getQuacks(viewer, { search: '  rubber   duck ' });
    expect(repository.getQuacks).toHaveBeenCalledWith({
      viewerId: 'u1',
      searchTerms: ['rubber', 'duck'],
    });
  });

  it('drops a leading @ so usernames match as they are displayed', async () => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);

    const service = new QuacksService(repository);

    await service.getQuacks(viewer, { search: '@CaffeinatedDuck bread @' });
    expect(repository.getQuacks).toHaveBeenCalledWith({
      viewerId: 'u1',
      searchTerms: ['CaffeinatedDuck', 'bread'],
    });
  });

  it('creates a quack owned by the signed-in user', async () => {
    const created = aQuack({ id: 'q2', text: 'hello' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(service.createQuack(user, { text: 'hello' })).resolves.toEqual(
      created,
    );
    // the author comes from the session, not from the caller's payload
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'hello',
      userId: 'u1',
    });
  });

  it('passes the chosen mood through to the repository', async () => {
    const created = aQuack({ id: 'q3', text: 'why', mood: 'angry' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(
      service.createQuack(user, { text: 'why', mood: 'angry' }),
    ).resolves.toEqual(created);
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'why',
      mood: 'angry',
      userId: 'u1',
    });
  });

  it('hides poll counts in the feed from a viewer who has not voted', async () => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([aQuack({ poll: aPoll() })]);

    const service = new QuacksService(repository);
    const [quack] = await service.getQuacks(viewer);

    expect(quack?.poll?.resultsVisible).toBe(false);
    expect(quack?.poll).not.toHaveProperty('totalVotes');
    expect(quack?.poll?.options[0]).not.toHaveProperty('votes');
  });

  describe('creating a quack with a poll', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: new Date('2026-01-01T12:00:00Z') });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('computes the deadline from the chosen duration on the server clock', async () => {
      const repository = mock<QuackRepository>();
      repository.createQuack.mockResolvedValue(
        aQuack({ poll: aPoll({ authorId: 'u1' }) }),
      );

      const service = new QuacksService(repository);
      const created = await service.createQuack(viewer, {
        text: 'Lunch?',
        poll: { options: ['Pho', 'Pizza'], duration: '1h' },
      });

      expect(repository.createQuack).toHaveBeenCalledWith({
        text: 'Lunch?',
        mood: undefined,
        userId: 'u1',
        poll: {
          options: ['Pho', 'Pizza'],
          closesAt: new Date('2026-01-01T13:00:00Z'),
        },
      });
      // the author always sees the counts on their own poll
      expect(created.poll?.resultsVisible).toBe(true);
    });

    it('leaves the deadline empty when no duration is picked', async () => {
      const repository = mock<QuackRepository>();
      repository.createQuack.mockResolvedValue(aQuack({ poll: aPoll() }));

      const service = new QuacksService(repository);
      await service.createQuack(viewer, {
        text: 'Lunch?',
        poll: { options: ['Pho', 'Pizza'] },
      });

      expect(repository.createQuack).toHaveBeenCalledWith(
        expect.objectContaining({
          poll: { options: ['Pho', 'Pizza'], closesAt: null },
        }),
      );
    });
  });

  describe('voting', () => {
    it('records the vote and returns the poll with counts visible', async () => {
      const repository = mock<QuackRepository>();
      repository.getPollByQuackId
        .mockResolvedValueOnce(aPoll())
        .mockResolvedValueOnce(
          aPoll({
            myOptionId: 'o2',
            options: [
              { id: 'o1', text: 'Pho', votes: 2 },
              { id: 'o2', text: 'Pizza', votes: 2 },
            ],
          }),
        );

      const service = new QuacksService(repository);
      const poll = await service.vote(viewer, 'q1', 'o2');

      expect(repository.upsertVote).toHaveBeenCalledWith({
        pollId: 'p1',
        optionId: 'o2',
        userId: 'u1',
      });
      expect(poll.myOptionId).toBe('o2');
      expect(poll.resultsVisible).toBe(true);
      expect(poll.totalVotes).toBe(4);
    });

    it('rejects a vote on a quack without a poll', async () => {
      const repository = mock<QuackRepository>();
      repository.getPollByQuackId.mockResolvedValue(null);

      const service = new QuacksService(repository);

      await expect(service.vote(viewer, 'q1', 'o1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.upsertVote).not.toHaveBeenCalled();
    });

    it('rejects a vote once the deadline has passed', async () => {
      const repository = mock<QuackRepository>();
      repository.getPollByQuackId.mockResolvedValue(
        aPoll({ closesAt: new Date(Date.now() - 1000) }),
      );

      const service = new QuacksService(repository);

      await expect(service.vote(viewer, 'q1', 'o1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repository.upsertVote).not.toHaveBeenCalled();
    });

    it('rejects an answer that belongs to another poll', async () => {
      const repository = mock<QuackRepository>();
      repository.getPollByQuackId.mockResolvedValue(aPoll());

      const service = new QuacksService(repository);

      await expect(
        service.vote(viewer, 'q1', 'someone-elses-option'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.upsertVote).not.toHaveBeenCalled();
    });
  });
});
