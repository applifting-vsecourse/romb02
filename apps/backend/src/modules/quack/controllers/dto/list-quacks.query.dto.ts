import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;
export const AUTHOR_FILTERS = ['me'] as const;

export class ListQuacksQueryDto {
  @ApiPropertyOptional({
    description:
      'Only return quacks matching every word (case-insensitive) in the text, author name or @username',
    example: 'bread alice',
    minLength: SEARCH_MIN_LENGTH,
    maxLength: SEARCH_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(SEARCH_MIN_LENGTH)
  @MaxLength(SEARCH_MAX_LENGTH)
  q?: string;

  @ApiPropertyOptional({
    description: 'Only return quacks by the signed-in user',
    enum: AUTHOR_FILTERS,
  })
  @IsOptional()
  @IsIn(AUTHOR_FILTERS)
  author?: (typeof AUTHOR_FILTERS)[number];
}
