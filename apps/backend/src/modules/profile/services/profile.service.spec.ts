import { Profile, UsernameTakenError } from '@/modules/profile/domain/profile';
import { ProfileRepository } from '@/modules/profile/repositories/profile.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { ProfileService } from './profile.service';

const user = { id: 'u1' } as Identity;

const aProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'u1',
  username: 'CaffeinatedDuck',
  name: 'Caffeinated Duck',
  bio: null,
  defaultMood: null,
  ...overrides,
});

const update = {
  username: 'espresso.duck',
  name: 'Espresso Duck',
  bio: 'Runs on coffee.',
  defaultMood: 'silly' as const,
};

describe('ProfileService', () => {
  it("returns the signed-in user's profile", async () => {
    const repository = mock<ProfileRepository>();
    repository.getProfile.mockResolvedValue(aProfile());

    const service = new ProfileService(repository);

    await expect(service.getProfile(user)).resolves.toEqual(aProfile());
    expect(repository.getProfile).toHaveBeenCalledWith('u1');
  });

  it('404s when the user no longer exists', async () => {
    const repository = mock<ProfileRepository>();
    repository.getProfile.mockResolvedValue(null);

    const service = new ProfileService(repository);

    await expect(service.getProfile(user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("updates the signed-in user's own profile", async () => {
    const updated = aProfile(update);
    const repository = mock<ProfileRepository>();
    repository.isUsernameTakenByAnotherUser.mockResolvedValue(false);
    repository.updateProfile.mockResolvedValue(updated);

    const service = new ProfileService(repository);

    await expect(service.updateProfile(user, update)).resolves.toEqual(updated);
    expect(repository.isUsernameTakenByAnotherUser).toHaveBeenCalledWith(
      'espresso.duck',
      'u1',
    );
    expect(repository.updateProfile).toHaveBeenCalledWith('u1', update);
  });

  it('refuses a username someone else already has', async () => {
    const repository = mock<ProfileRepository>();
    repository.isUsernameTakenByAnotherUser.mockResolvedValue(true);

    const service = new ProfileService(repository);

    await expect(service.updateProfile(user, update)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });

  it('refuses a username claimed between the check and the write', async () => {
    const repository = mock<ProfileRepository>();
    repository.isUsernameTakenByAnotherUser.mockResolvedValue(false);
    repository.updateProfile.mockRejectedValue(
      new UsernameTakenError('espresso.duck'),
    );

    const service = new ProfileService(repository);

    await expect(service.updateProfile(user, update)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
