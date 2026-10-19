import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto';

const validProfile = {
  username: 'caffeinated.duck_2',
  name: 'Caffeinated Duck',
  bio: 'Runs on coffee.',
  defaultMood: 'happy',
};

const validateBody = async (
  overrides: Record<string, unknown> = {},
): Promise<{ dto: UpdateProfileDto; errors: ValidationError[] }> => {
  const dto = plainToInstance(UpdateProfileDto, {
    ...validProfile,
    ...overrides,
  });
  return { dto, errors: await validate(dto) };
};

const failingFields = (errors: ValidationError[]): string[] =>
  errors.map((error) => error.property);

describe('UpdateProfileDto', () => {
  it('accepts a full profile', async () => {
    const { errors } = await validateBody();
    expect(errors).toHaveLength(0);
  });

  it('accepts no bio and no default mood', async () => {
    const { errors } = await validateBody({ bio: null, defaultMood: null });
    expect(errors).toHaveLength(0);
  });

  it.each(['ab', 'a'.repeat(31), 'has space', 'dash-ed', 'émile', '@duck'])(
    'rejects the username %p',
    async (username) => {
      const { errors } = await validateBody({ username });
      expect(failingFields(errors)).toEqual(['username']);
    },
  );

  it.each(['abc', 'a'.repeat(30), 'Duck.Duck_Goose9'])(
    'accepts the username %p',
    async (username) => {
      const { errors } = await validateBody({ username });
      expect(errors).toHaveLength(0);
    },
  );

  it('requires a display name', async () => {
    const { errors } = await validateBody({ name: '   ' });
    expect(failingFields(errors)).toEqual(['name']);
  });

  it('turns a blank bio into no bio', async () => {
    const { dto, errors } = await validateBody({ bio: '   ' });
    expect(errors).toHaveLength(0);
    expect(dto.bio).toBeNull();
  });

  it('rejects a bio longer than 160 characters', async () => {
    const { errors } = await validateBody({ bio: 'a'.repeat(161) });
    expect(failingFields(errors)).toEqual(['bio']);
  });

  it('rejects an unknown mood', async () => {
    const { errors } = await validateBody({ defaultMood: 'grumpy' });
    expect(failingFields(errors)).toEqual(['defaultMood']);
  });
});
