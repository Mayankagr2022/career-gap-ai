import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  // The web app lives on another address (for example GitHub Pages), where browsers will not send our cookies.
  // Tokens are then returned to the web app instead of being set as cookies.
  tokenMode: process.env.AUTH_TOKEN_MODE === 'true',
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));
