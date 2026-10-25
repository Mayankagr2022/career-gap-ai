import { jwtConfig } from './jwt.config';

describe('jwtConfig', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('uses the development fallbacks outside production', () => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    process.env.NODE_ENV = 'development';
    expect(jwtConfig().secret).toContain('fallback');
  });

  it('refuses to start in production without private secrets', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    process.env.JWT_REFRESH_SECRET = 'a-real-refresh-secret';
    expect(() => jwtConfig()).toThrow('JWT_SECRET');
  });

  it('refuses the public fallback value in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a-real-secret';
    process.env.JWT_REFRESH_SECRET = 'fallback-refresh-secret-change-in-production';
    expect(() => jwtConfig()).toThrow('JWT_REFRESH_SECRET');
  });

  it('accepts private secrets in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a-real-secret';
    process.env.JWT_REFRESH_SECRET = 'a-real-refresh-secret';
    expect(jwtConfig()).toMatchObject({ secret: 'a-real-secret', refreshSecret: 'a-real-refresh-secret' });
  });
});
