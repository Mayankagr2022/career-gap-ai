import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '1d',
}));
