import {
  BIO_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from '@/modules/profile/domain/profile';
import { Mood, MOODS } from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// An empty bio is no bio at all.
const trimToNull = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

// Replaces the whole profile: every field is sent, and a missing optional one
// clears it.
export class UpdateProfileDto {
  @ApiProperty({
    description: 'Letters, numbers, dots and underscores',
    example: 'caffeinated.duck',
    minLength: USERNAME_MIN_LENGTH,
    maxLength: USERNAME_MAX_LENGTH,
    pattern: USERNAME_PATTERN.source,
  })
  @Transform(trim)
  @IsString()
  @Length(USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH)
  @Matches(USERNAME_PATTERN, {
    message: 'username may only contain letters, numbers, dots and underscores',
  })
  username!: string;

  @ApiProperty({ description: 'Display name', example: 'Caffeinated Duck' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    maxLength: BIO_MAX_LENGTH,
    example: 'Runs on espresso and pond water.',
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(BIO_MAX_LENGTH)
  bio?: string | null;

  @ApiProperty({
    description: 'Mood new quacks start with — null for none',
    enum: MOODS,
    nullable: true,
    required: false,
    example: 'happy',
  })
  @IsOptional()
  @IsIn(MOODS)
  defaultMood?: Mood | null;
}
