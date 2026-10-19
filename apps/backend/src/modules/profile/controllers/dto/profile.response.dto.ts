import { Profile } from '@/modules/profile/domain/profile';
import { Mood, MOODS } from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  bio!: string | null;

  @ApiProperty({ enum: MOODS, nullable: true })
  defaultMood!: Mood | null;

  static fromDomain(profile: Profile): ProfileResponseDto {
    return {
      id: profile.id,
      username: profile.username,
      name: profile.name,
      bio: profile.bio,
      defaultMood: profile.defaultMood,
    };
  }
}
