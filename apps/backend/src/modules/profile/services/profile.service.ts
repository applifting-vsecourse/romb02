import {
  Profile,
  ProfileUpdate,
  UsernameTakenError,
} from '@/modules/profile/domain/profile';
import { ProfileRepository } from '@/modules/profile/repositories/profile.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

export const USERNAME_TAKEN_MESSAGE = 'That username is already taken';

@Injectable()
export class ProfileService {
  constructor(private readonly profileRepository: ProfileRepository) {}

  async getProfile(user: Identity): Promise<Profile> {
    const profile = await this.profileRepository.getProfile(user.id);
    if (!profile) throw new NotFoundException();
    return profile;
  }

  // The profile is always the signed-in user's own — the id comes from the
  // session, never from the request.
  async updateProfile(user: Identity, update: ProfileUpdate): Promise<Profile> {
    if (
      await this.profileRepository.isUsernameTakenByAnotherUser(
        update.username,
        user.id,
      )
    ) {
      throw new ConflictException(USERNAME_TAKEN_MESSAGE);
    }

    try {
      return await this.profileRepository.updateProfile(user.id, update);
    } catch (error) {
      if (error instanceof UsernameTakenError) {
        throw new ConflictException(USERNAME_TAKEN_MESSAGE);
      }
      throw error;
    }
  }
}
