import { registerAs } from '@nestjs/config';

const DEV_FALLBACKS = {
  JWT_SECRET: 'fallback-secret-change-in-production',
  JWT_REFRESH_SECRET: 'fallback-refresh-secret-change-in-production',
} as const;

/** The development fallbacks are public (they are in the repository); production must never sign tokens with them. */
function secret(name: keyof typeof DEV_FALLBACKS): string {
  const value = process.env[name];
  if (process.env.NODE_ENV === 'production' && (!value || value === DEV_FALLBACKS[name])) {
    throw new Error(`${name} must be set to a private value in production`);
  }
  return value || DEV_FALLBACKS[name];
}

export const jwtConfig = registerAs('jwt', () => ({
  secret: secret('JWT_SECRET'),
  // Short-lived: a copied access token stops working soon after logout. The browser refreshes it silently.
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshSecret: secret('JWT_REFRESH_SECRET'),
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
}));
