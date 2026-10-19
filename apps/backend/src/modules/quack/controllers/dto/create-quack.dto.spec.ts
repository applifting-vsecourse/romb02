import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateQuackDto } from './create-quack.dto';

const validateBody = async (
  body: Record<string, unknown>,
): Promise<{ dto: CreateQuackDto; errors: ValidationError[] }> => {
  const dto = plainToInstance(CreateQuackDto, body);
  return { dto, errors: await validate(dto) };
};

const withPoll = (poll: Record<string, unknown>): Record<string, unknown> => ({
  text: 'Lunch?',
  poll,
});

describe('CreateQuackDto', () => {
  it('accepts a quack without a poll', async () => {
    const { errors } = await validateBody({ text: 'just a quack' });
    expect(errors).toHaveLength(0);
  });

  describe('poll', () => {
    it('accepts 2 answers and no deadline', async () => {
      const { errors } = await validateBody(
        withPoll({ options: ['Pho', 'Pizza'] }),
      );
      expect(errors).toHaveLength(0);
    });

    it('accepts 4 answers and a preset deadline', async () => {
      const { errors } = await validateBody(
        withPoll({ options: ['A', 'B', 'C', 'D'], duration: '1w' }),
      );
      expect(errors).toHaveLength(0);
    });

    it('trims each answer', async () => {
      const { dto, errors } = await validateBody(
        withPoll({ options: ['  Pho ', 'Pizza  '] }),
      );
      expect(errors).toHaveLength(0);
      expect(dto.poll?.options).toEqual(['Pho', 'Pizza']);
    });

    it('rejects a single answer', async () => {
      const { errors } = await validateBody(withPoll({ options: ['Pho'] }));
      expect(errors).toHaveLength(1);
    });

    it('rejects more than 4 answers', async () => {
      const { errors } = await validateBody(
        withPoll({ options: ['A', 'B', 'C', 'D', 'E'] }),
      );
      expect(errors).toHaveLength(1);
    });

    it('rejects an answer that is blank after trimming', async () => {
      const { errors } = await validateBody(
        withPoll({ options: ['Pho', '   '] }),
      );
      expect(errors).toHaveLength(1);
    });

    it('rejects an answer longer than 80 characters', async () => {
      const { errors } = await validateBody(
        withPoll({ options: ['Pho', 'a'.repeat(81)] }),
      );
      expect(errors).toHaveLength(1);
    });

    it('accepts an answer of exactly 80 characters', async () => {
      const { errors } = await validateBody(
        withPoll({ options: ['Pho', 'a'.repeat(80)] }),
      );
      expect(errors).toHaveLength(0);
    });

    it('rejects answers that repeat ignoring case and spaces', async () => {
      const { errors } = await validateBody(
        withPoll({ options: ['Pizza', ' pizza '] }),
      );
      expect(errors).toHaveLength(1);
    });

    it('rejects an unknown deadline', async () => {
      const { errors } = await validateBody(
        withPoll({ options: ['Pho', 'Pizza'], duration: '2h' }),
      );
      expect(errors).toHaveLength(1);
    });

    it('rejects answers that are not strings', async () => {
      const { errors } = await validateBody(withPoll({ options: [1, 2] }));
      expect(errors).toHaveLength(1);
    });
  });
});
