// Mirrors the backend's MODERATOR_ROLES: these roles may delete any quack.
// It only decides what the UI offers — the server enforces it independently.
const MODERATOR_ROLES = ["moderator", "admin"]

export const canModerate = (role: string | undefined): boolean =>
  role !== undefined && MODERATOR_ROLES.includes(role)
