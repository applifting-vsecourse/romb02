import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma, User as PrismaUser } from '@/generated/prisma/client';
import {
  Profile,
  ProfileUpdate,
  UsernameTakenError,
} from '@/modules/profile/domain/profile';
import { Injectable } from '@nestjs/common';

const mapPrismaUserToProfile = (user: PrismaUser): Profile => ({
  id: user.id,
  username: user.username ?? '',
  name: user.name,
  bio: user.bio,
  defaultMood: user.defaultMood,
});

@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<Profile | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user ? mapPrismaUserToProfile(user) : null;
  }

  // Case-insensitive, so "alice" and "Alice" can't be two different people.
  async isUsernameTakenByAnotherUser(
    username: string,
    userId: string,
  ): Promise<boolean> {
    const owner = await this.prisma.user.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
        id: { not: userId },
      },
      select: { id: true },
    });
    return owner !== null;
  }

  async updateProfile(userId: string, update: ProfileUpdate): Promise<Profile> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          username: update.username,
          // better-auth's username plugin reads this one for display.
          displayUsername: update.username,
          name: update.name,
          bio: update.bio,
          defaultMood: update.defaultMood,
        },
      });
      return mapPrismaUserToProfile(user);
    } catch (error) {
      // Someone claimed the same username between the check and the write.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new UsernameTakenError(update.username);
      }
      throw error;
    }
  }
}
