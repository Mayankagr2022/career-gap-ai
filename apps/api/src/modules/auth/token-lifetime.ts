/**
 * Read the lifetime of a JWT from its own claims (without verifying it; the token was just signed by us).
 * Cookie lifetimes and session expiry follow the token instead of repeating a number that can drift out of step
 * with JWT_EXPIRES_IN / JWT_REFRESH_EXPIRES_IN.
 */
function claims(token: string): { exp?: number; iat?: number } | undefined {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
}

/** Moment the token expires, as milliseconds since the epoch. */
export function tokenExpiresAt(token: string): number | undefined {
  const exp = claims(token)?.exp;
  return typeof exp === 'number' ? exp * 1000 : undefined;
}

/** How long the token is valid for, in milliseconds. */
export function tokenLifetimeMs(token: string): number | undefined {
  const c = claims(token);
  return typeof c?.exp === 'number' && typeof c?.iat === 'number' ? (c.exp - c.iat) * 1000 : undefined;
}
