import {
  isPollClosed,
  PollDuration,
  PollView,
  toClosesAt,
  toPollView,
} from '@/modules/quack/domain/poll';
import { Mood, Quack, QuackView } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

export const POLL_NOT_FOUND_MESSAGE = 'That poll does not exist';
export const POLL_CLOSED_MESSAGE = 'This poll is closed';
export const QUACK_NOT_FOUND_MESSAGE = 'That quack does not exist';
export const NOT_QUACK_AUTHOR_MESSAGE = 'You can only delete your own quacks';
export const OPTION_NOT_IN_POLL_MESSAGE =
  'That answer is not part of this poll';

// Splits a search into words that must all match. A leading "@" is dropped so
// "@alice" finds the username the UI renders as "@alice".
const toSearchTerms = (search?: string): string[] =>
  (search ?? '')
    .split(/\s+/)
    .map((word) => word.replace(/^@+/, ''))
    .filter((word) => word.length > 0);

// Everything that leaves the service goes through here, so a viewer never
// receives counts they aren't allowed to see.
const toQuackView = (quack: Quack, viewerId: string, now: Date): QuackView => ({
  ...quack,
  poll: quack.poll ? toPollView(quack.poll, viewerId, now) : null,
});

@Injectable()
export class QuacksService {
  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(
    viewer: Identity,
    filter: { search?: string; onlyMine?: boolean } = {},
  ): Promise<QuackView[]> {
    const quacks = await this.quackRepository.getQuacks({
      viewerId: viewer.id,
      searchTerms: toSearchTerms(filter.search),
      authorId: filter.onlyMine ? viewer.id : undefined,
    });
    const now = new Date();
    return quacks.map((quack) => toQuackView(quack, viewer.id, now));
  }

  async createQuack(
    user: Identity,
    quackData: {
      text: string;
      mood?: Mood;
      poll?: { options: string[]; duration?: PollDuration };
    },
  ): Promise<QuackView> {
    const now = new Date();
    const quack = await this.quackRepository.createQuack({
      text: quackData.text,
      mood: quackData.mood,
      // the author is taken from the session, never from the request body
      userId: user.id,
      // the deadline is computed on the server clock, never sent by the client
      poll: quackData.poll && {
        options: quackData.poll.options,
        closesAt: toClosesAt(quackData.poll.duration, now),
      },
    });
    return toQuackView(quack, user.id, now);
  }

  // Only the author may delete a quack. The repository re-checks ownership in
  // the delete itself; the lookup is just there to tell "gone" from "not yours".
  async deleteQuack(user: Identity, quackId: string): Promise<void> {
    const quack = await this.quackRepository.getQuackById(quackId);
    if (!quack) throw new NotFoundException(QUACK_NOT_FOUND_MESSAGE);
    if (quack.userId !== user.id) {
      throw new ForbiddenException(NOT_QUACK_AUTHOR_MESSAGE);
    }

    const deleted = await this.quackRepository.deleteQuack({
      quackId,
      authorId: user.id,
    });
    // Deleted by a parallel request in between.
    if (!deleted) throw new NotFoundException(QUACK_NOT_FOUND_MESSAGE);
  }

  // Sets the user's vote, replacing any earlier one. There is deliberately no
  // way to take a vote back.
  async vote(
    user: Identity,
    quackId: string,
    optionId: string,
  ): Promise<PollView> {
    const poll = await this.quackRepository.getPollByQuackId(quackId, user.id);
    if (!poll) throw new NotFoundException(POLL_NOT_FOUND_MESSAGE);

    if (isPollClosed(poll, new Date())) {
      throw new ConflictException(POLL_CLOSED_MESSAGE);
    }
    if (!poll.options.some((option) => option.id === optionId)) {
      throw new BadRequestException(OPTION_NOT_IN_POLL_MESSAGE);
    }

    await this.quackRepository.upsertVote({
      pollId: poll.id,
      optionId,
      userId: user.id,
    });

    const updated = await this.quackRepository.getPollByQuackId(
      quackId,
      user.id,
    );
    if (!updated) throw new NotFoundException(POLL_NOT_FOUND_MESSAGE);
    return toPollView(updated, user.id, new Date());
  }
}
