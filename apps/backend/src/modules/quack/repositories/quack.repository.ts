import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Prisma,
  Quack as PrismaQuack,
  User as PrismaUser,
} from '@/generated/prisma/client';
import { Poll } from '@/modules/quack/domain/poll';
import { Mood, Quack } from '@/modules/quack/domain/quack';
import { Injectable } from '@nestjs/common';

// Loads a poll the way one viewer sees it: every option with its vote count,
// plus only that viewer's own vote — never anyone else's. The return type is
// inferred on purpose: Prisma derives the payload type from this exact shape.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const pollInclude = (viewerId: string) =>
  ({
    quack: { select: { userId: true } },
    options: {
      orderBy: { position: 'asc' },
      include: { _count: { select: { votes: true } } },
    },
    votes: {
      where: { userId: viewerId },
      select: { optionId: true },
      take: 1,
    },
  }) satisfies Prisma.PollInclude;

type PrismaPollForViewer = Prisma.PollGetPayload<{
  include: ReturnType<typeof pollInclude>;
}>;

const mapPrismaPollToDomain = (poll: PrismaPollForViewer): Poll => ({
  id: poll.id,
  quackId: poll.quackId,
  authorId: poll.quack.userId,
  closesAt: poll.closesAt,
  options: poll.options.map((option) => ({
    id: option.id,
    text: option.text,
    votes: option._count.votes,
  })),
  myOptionId: poll.votes[0]?.optionId ?? null,
});

const mapPrismaQuackToDomain = (
  quack: PrismaQuack & {
    user?: PrismaUser;
    poll?: PrismaPollForViewer | null;
  },
): Quack => ({
  id: quack.id,
  text: quack.text,
  mood: quack.mood,
  userId: quack.userId,
  createdAt: quack.createdAt,
  updatedAt: quack.updatedAt,
  user: quack.user
    ? {
        id: quack.user.id,
        name: quack.user.name,
        username: quack.user.username ?? '',
      }
    : undefined,
  poll:
    quack.poll === undefined
      ? undefined
      : quack.poll && mapPrismaPollToDomain(quack.poll),
});

// Prisma passes `contains` straight into ILIKE, so a search for "_" or "%"
// would otherwise match every quack. Backslash is Postgres' default escape.
const escapeLikePattern = (term: string): string =>
  term.replace(/[\\%_]/g, '\\$&');

/**
 * If you decide to choose a different ORM or database, you should only need to change the repository files methods implementation.
 * Inject what you need instead of PrismaService and re-implement the methods and model mapping.
 */
@Injectable()
export class QuackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getQuacks(filter: {
    viewerId: string;
    searchTerms?: string[];
    authorId?: string;
  }): Promise<Quack[]> {
    const quacks = await this.prisma.quack.findMany({
      // Every term has to appear somewhere in the text or the author, in any order.
      where: {
        userId: filter.authorId,
        AND: (filter.searchTerms ?? []).map(escapeLikePattern).map((term) => ({
          OR: [
            { text: { contains: term, mode: 'insensitive' as const } },
            {
              user: { name: { contains: term, mode: 'insensitive' as const } },
            },
            {
              user: {
                username: { contains: term, mode: 'insensitive' as const },
              },
            },
          ],
        })),
      },
      include: { user: true, poll: { include: pollInclude(filter.viewerId) } },
      orderBy: { createdAt: 'desc' },
    });
    return quacks.map(mapPrismaQuackToDomain);
  }

  async createQuack(createQuackData: {
    text: string;
    mood?: Mood;
    userId: string;
    poll?: { options: string[]; closesAt: Date | null };
  }): Promise<Quack> {
    const { poll } = createQuackData;
    // One nested write: the quack, its poll and the options exist together or
    // not at all.
    const quack = await this.prisma.quack.create({
      data: {
        text: createQuackData.text,
        mood: createQuackData.mood,
        user: { connect: { id: createQuackData.userId } },
        poll: poll
          ? {
              create: {
                closesAt: poll.closesAt,
                options: {
                  create: poll.options.map((text, position) => ({
                    text,
                    position,
                  })),
                },
              },
            }
          : undefined,
      },
      include: {
        user: true,
        poll: { include: pollInclude(createQuackData.userId) },
      },
    });
    return mapPrismaQuackToDomain(quack);
  }

  async getQuackById(quackId: string): Promise<Quack | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
    });
    return quack ? mapPrismaQuackToDomain(quack) : null;
  }

  // Deletes the quack only if it belongs to the given author, in one statement,
  // so ownership can't change between a check and the delete. The poll, its
  // options and votes go with it (ON DELETE CASCADE). Returns whether a quack
  // was deleted.
  async deleteQuack(filter: {
    quackId: string;
    authorId: string;
  }): Promise<boolean> {
    const { count } = await this.prisma.quack.deleteMany({
      where: { id: filter.quackId, userId: filter.authorId },
    });
    return count > 0;
  }

  async getPollByQuackId(
    quackId: string,
    viewerId: string,
  ): Promise<Poll | null> {
    const poll = await this.prisma.poll.findUnique({
      where: { quackId },
      include: pollInclude(viewerId),
    });
    return poll ? mapPrismaPollToDomain(poll) : null;
  }

  // Sets the user's vote, replacing any earlier one. Prisma runs this as a
  // single INSERT ... ON CONFLICT DO UPDATE on (pollId, userId), so parallel
  // requests can never leave two votes behind. The composite foreign key
  // (optionId, pollId) rejects an option from another poll.
  async upsertVote(vote: {
    pollId: string;
    optionId: string;
    userId: string;
  }): Promise<void> {
    await this.prisma.pollVote.upsert({
      where: { pollId_userId: { pollId: vote.pollId, userId: vote.userId } },
      create: vote,
      update: { optionId: vote.optionId },
    });
  }
}
