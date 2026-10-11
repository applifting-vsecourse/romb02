import { Mood, Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable } from '@nestjs/common';

// Splits a search into words that must all match. A leading "@" is dropped so
// "@alice" finds the username the UI renders as "@alice".
const toSearchTerms = (search?: string): string[] =>
  (search ?? '')
    .split(/\s+/)
    .map((word) => word.replace(/^@+/, ''))
    .filter((word) => word.length > 0);

@Injectable()
export class QuacksService {
  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(filter: { search?: string } = {}): Promise<Quack[]> {
    return this.quackRepository.getQuacks({
      searchTerms: toSearchTerms(filter.search),
    });
  }

  async createQuack(
    user: Identity,
    quackData: { text: string; mood?: Mood },
  ): Promise<Quack> {
    return this.quackRepository.createQuack({
      text: quackData.text,
      mood: quackData.mood,
      // the author is taken from the session, never from the request body
      userId: user.id,
    });
  }
}
