import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ListQuacksQueryDto } from './list-quacks.query.dto';

const validateQuery = async (
  query: Record<string, unknown>,
): Promise<{ dto: ListQuacksQueryDto; errors: ValidationError[] }> => {
  const dto = plainToInstance(ListQuacksQueryDto, query);
  return { dto, errors: await validate(dto) };
};

describe('ListQuacksQueryDto', () => {
  it('accepts no search at all', async () => {
    const { errors } = await validateQuery({});
    expect(errors).toHaveLength(0);
  });

  it('trims the search', async () => {
    const { dto, errors } = await validateQuery({ q: '  duck  ' });
    expect(errors).toHaveLength(0);
    expect(dto.q).toBe('duck');
  });

  it('rejects a search shorter than 2 characters after trimming', async () => {
    const { errors } = await validateQuery({ q: ' d ' });
    expect(errors).toHaveLength(1);
  });

  it('rejects a search longer than 100 characters', async () => {
    const { errors } = await validateQuery({ q: 'a'.repeat(101) });
    expect(errors).toHaveLength(1);
  });

  it('accepts a search of exactly 100 characters', async () => {
    const { errors } = await validateQuery({ q: 'a'.repeat(100) });
    expect(errors).toHaveLength(0);
  });
});
