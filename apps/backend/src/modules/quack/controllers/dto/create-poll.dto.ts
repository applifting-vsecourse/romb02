import {
  POLL_DURATIONS,
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  POLL_OPTION_MAX_LENGTH,
  PollDuration,
} from '@/modules/quack/domain/poll';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateBy,
} from 'class-validator';

const isUniqueIgnoringCase = (value: unknown): boolean =>
  Array.isArray(value) &&
  new Set(
    value.map((item: unknown) =>
      typeof item === 'string' ? item.toLowerCase() : item,
    ),
  ).size === value.length;

export class CreatePollDto {
  @ApiProperty({
    description: `The answers to choose from, in display order — ${POLL_MIN_OPTIONS} to ${POLL_MAX_OPTIONS}, unique ignoring case`,
    example: ['Pho', 'Pizza'],
    type: [String],
    minItems: POLL_MIN_OPTIONS,
    maxItems: POLL_MAX_OPTIONS,
  })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((item: unknown) =>
          typeof item === 'string' ? item.trim() : item,
        )
      : value,
  )
  @IsArray()
  @ArrayMinSize(POLL_MIN_OPTIONS)
  @ArrayMaxSize(POLL_MAX_OPTIONS)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(POLL_OPTION_MAX_LENGTH, { each: true })
  @ValidateBy({
    name: 'isUniqueIgnoringCase',
    validator: {
      validate: isUniqueIgnoringCase,
      defaultMessage: () => 'Answers must be different from each other',
    },
  })
  options!: string[];

  @ApiPropertyOptional({
    description: 'How long the poll stays open — omit for no deadline',
    enum: POLL_DURATIONS,
    example: '1d',
  })
  @IsOptional()
  @IsIn(POLL_DURATIONS)
  duration?: PollDuration;
}
