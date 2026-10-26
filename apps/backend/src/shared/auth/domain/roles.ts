import { Identity } from './identity';

// Roles that may moderate content — currently: delete any quack.
export const MODERATOR_ROLES = ['moderator', 'admin'];

export const canModerate = (user: Identity): boolean =>
  MODERATOR_ROLES.includes(user.role);
