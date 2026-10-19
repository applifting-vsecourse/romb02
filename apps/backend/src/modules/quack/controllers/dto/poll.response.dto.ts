import { PollView } from '@/modules/quack/domain/poll';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PollOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiPropertyOptional({
    description: 'Only present when `resultsVisible` is true',
  })
  votes?: number;
}

export class PollResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'null when the poll has no deadline',
  })
  closesAt!: Date | null;

  @ApiProperty()
  closed!: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "The signed-in user's vote, or null",
  })
  myOptionId!: string | null;

  @ApiProperty({
    description:
      'True for voters, the author, and everyone once the poll has closed. When false, the counts are left out.',
  })
  resultsVisible!: boolean;

  @ApiPropertyOptional({
    description: 'Only present when `resultsVisible` is true',
  })
  totalVotes?: number;

  @ApiProperty({ type: [PollOptionResponseDto] })
  options!: PollOptionResponseDto[];

  static fromDomain(poll: PollView): PollResponseDto {
    return poll;
  }
}
