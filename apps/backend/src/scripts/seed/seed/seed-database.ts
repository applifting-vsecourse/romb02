import { PrismaService } from '@/core/prisma/prisma.service';
import { User } from '@/generated/prisma/client';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { Config } from '@/shared/config/config.service';
import { createQuack } from './create-quack';
import { createUser } from './create-user';

const MINUTE_IN_MS = 60 * 1000;

export const seedDatabase = async (
  prisma: PrismaService,
  config: Config,
  betterAuth: BetterAuth,
): Promise<void> => {
  const auth = betterAuth;

  // `pnpm dev` runs the seed on every start, so never clobber a database that
  // already has data — that would delete the account and posts you just made.
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log(
      `Database already has ${existingUsers} user(s) — skipping seed. ` +
        'Run `pnpm backend db:reset` to wipe and start over.',
    );
    return;
  }

  // Drop existing database data from all tables
  try {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "poll_vote", "poll_option", "poll", "quack", "session", "account", "verification", "user" RESTART IDENTITY CASCADE;',
    );
  } catch (error) {
    console.error('Error truncating tables:', error);
  }

  console.log('Creating superadmin user');

  // Create a superadmin user. This should be delete in prod app
  await createUser(prisma, auth, {
    email: config.superadminEmail,
    password: config.superadminPassword,
    name: 'Admin (Delete in Prod)',
    username: 'superadmin',
    role: 'admin',
  });

  console.log('Creating example users');

  const caffeinatedDuck = await createUser(prisma, auth, {
    email: 'caffeinatedduck@example.com',
    password: 'password1',
    name: 'Caffeinated Duck',
    username: 'CaffeinatedDuck',
  });

  const deepDuckThoughts = await createUser(prisma, auth, {
    email: 'deepduckthoughts@example.com',
    password: 'password2',
    name: 'Deep Duck Thoughts',
    username: 'DeepDuckThoughts',
  });

  const breadCritic = await createUser(prisma, auth, {
    email: 'breadcritic@example.com',
    password: 'password3',
    name: 'The Bread Critic',
    username: 'BreadCritic',
  });

  const migrationSeason = await createUser(prisma, auth, {
    email: 'migrationseason@example.com',
    password: 'password4',
    name: 'Migration Season',
    username: 'MigrationSeason',
  });

  const pondAdmin = await createUser(prisma, auth, {
    email: 'pondadmin@example.com',
    password: 'password5',
    name: 'Pond Admin',
    username: 'PondAdmin',
  });

  // Can delete any quack. Posts nothing of their own.
  await createUser(prisma, auth, {
    email: 'moderator@example.com',
    password: 'password6',
    name: 'Moderator Duck',
    username: 'ModeratorDuck',
    role: 'moderator',
  });

  console.log('Creating example quacks');

  // Listed oldest first. The feed sorts newest first, so the last entry here is
  // the one at the top of the screen.
  const exampleQuacks: {
    author: User;
    minutesAgo: number;
    text: string;
    poll?: {
      options: string[];
      // minutes from now; negative = already closed, undefined = never closes
      closesInMinutes?: number;
      votes?: { voter: User; option: number }[];
    };
  }[] = [
    {
      author: pondAdmin,
      minutesAgo: 2870,
      text: `Reminder: the north end of the pond is closed for reed maintenance until Thursday.
Yes, again. No, we don't know why the contractor is a heron.`,
    },
    {
      author: migrationSeason,
      minutesAgo: 2610,
      text: `Left at dawn. 400 km down, 2,600 to go.
The V formation works beautifully right up until whoever is at the front decides to take a shortcut.`,
    },
    {
      author: breadCritic,
      minutesAgo: 2255,
      text: `Sourdough. Thrown by a child. Landed two metres short of anyone.
Crust: excellent. Delivery: amateur. 6/10.`,
    },
    {
      author: caffeinatedDuck,
      minutesAgo: 1980,
      text: `just spilled coffee on my keyboard
now every time i type "duck" it autocorrects to "quack"
send help or more caffeine`,
    },
    {
      author: pondAdmin,
      minutesAgo: 1700,
      text: `Quick poll for the pond committee: when should we hold the reed maintenance vote?`,
      poll: {
        options: [
          'Monday morning',
          'Wednesday evening',
          'Never, the heron decides',
        ],
        closesInMinutes: -260,
        votes: [
          { voter: caffeinatedDuck, option: 2 },
          { voter: deepDuckThoughts, option: 2 },
          { voter: breadCritic, option: 1 },
          { voter: migrationSeason, option: 0 },
        ],
      },
    },
    {
      author: deepDuckThoughts,
      minutesAgo: 1495,
      text: `If a pond reflects the sky, is the sky just a very large and very shy pond?`,
    },
    {
      author: migrationSeason,
      minutesAgo: 1240,
      text: `Update on the shortcut: it added 90 km and one entire mountain.
We are not currently speaking to the front of the V.`,
    },
    {
      author: pondAdmin,
      minutesAgo: 890,
      text: `Whoever keeps rearranging the stones on the west bank — we see you.
We have footage. It is extremely blurry footage. But we have it.`,
    },
    {
      author: caffeinatedDuck,
      minutesAgo: 640,
      text: `third espresso and i can hear colours now
one of them is quacking`,
    },
    {
      author: breadCritic,
      minutesAgo: 415,
      text: `Multigrain. Seeds still attached. Genuinely nutritious.
The pond is not ready for this level of quality and, frankly, neither am I. 9/10.`,
    },
    {
      author: deepDuckThoughts,
      minutesAgo: 260,
      text: `Everyone says "water off a duck's back" like it's a compliment.
Some of us would quite like to feel things.`,
    },
    {
      author: caffeinatedDuck,
      minutesAgo: 95,
      text: `me: throws one crumb into the pond
ducks: assemble like the Avengers
i fear i may have started something`,
    },
    {
      author: breadCritic,
      minutesAgo: 45,
      text: `Settling this once and for all. Which bread do we review next?`,
      poll: {
        options: ['Rye', 'Brioche', 'Baguette', 'Pita'],
        votes: [
          { voter: caffeinatedDuck, option: 1 },
          { voter: migrationSeason, option: 2 },
          { voter: pondAdmin, option: 1 },
        ],
      },
    },
    {
      author: pondAdmin,
      minutesAgo: 20,
      text: `The bread situation has been resolved. The swan has been spoken to.
Please stop tagging me.`,
    },
  ];

  const now = Date.now();

  for (const { author, minutesAgo, text, poll } of exampleQuacks) {
    await createQuack(prisma, {
      text,
      userId: author.id,
      createdAt: new Date(now - minutesAgo * MINUTE_IN_MS),
      poll: poll && {
        options: poll.options,
        closesAt:
          poll.closesInMinutes === undefined
            ? null
            : new Date(now + poll.closesInMinutes * MINUTE_IN_MS),
        votes: poll.votes?.map(({ voter, option }) => ({
          userId: voter.id,
          option,
        })),
      },
    });
  }
};
