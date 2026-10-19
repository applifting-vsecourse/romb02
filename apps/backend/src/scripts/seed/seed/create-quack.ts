import { PrismaService } from '@/core/prisma/prisma.service';
import { Quack } from '@/modules/quack/domain/quack';

type CreateQuackParams = {
  text: string;
  userId: string;
  // Optional so the seed can spread posts over time. Without it every seeded
  // quack shares one timestamp and the feed reads like a single burst.
  createdAt?: Date;
  // Optional poll: the answers in display order, who voted for which answer
  // (by index), and when it closes (null = never).
  poll?: {
    options: string[];
    closesAt: Date | null;
    votes?: { userId: string; option: number }[];
  };
};

export async function createQuack(
  prisma: PrismaService,
  params: CreateQuackParams,
): Promise<Quack> {
  const { text, userId, createdAt, poll } = params;

  const quack = await prisma.quack.create({
    data: {
      text,
      createdAt,
      user: {
        connect: {
          id: userId,
        },
      },
      poll: poll
        ? {
            create: {
              closesAt: poll.closesAt,
              createdAt,
              options: {
                create: poll.options.map((option, position) => ({
                  text: option,
                  position,
                })),
              },
            },
          }
        : undefined,
    },
  });

  if (poll?.votes) {
    const { id: pollId, options } = await prisma.poll.findUniqueOrThrow({
      where: { quackId: quack.id },
      include: { options: true },
    });
    await prisma.pollVote.createMany({
      data: poll.votes.map((vote) => {
        const option = options.find((o) => o.position === vote.option);
        if (!option) {
          throw new Error(`Seed poll has no option at index ${vote.option}`);
        }
        return { pollId, optionId: option.id, userId: vote.userId };
      }),
    });
  }

  return quack;
}
