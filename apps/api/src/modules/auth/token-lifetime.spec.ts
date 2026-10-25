import { JwtService } from '@nestjs/jwt';
import { tokenExpiresAt, tokenLifetimeMs } from './token-lifetime';

describe('token lifetime', () => {
  const jwt = new JwtService({});

  it('reads the lifetime and expiry from the token itself', async () => {
    const token = await jwt.signAsync({ sub: 'u1' }, { secret: 'test', expiresIn: '15m' });
    expect(tokenLifetimeMs(token)).toBe(15 * 60 * 1000);
    const expiresAt = tokenExpiresAt(token)!;
    expect(expiresAt).toBeGreaterThan(Date.now() + 14 * 60 * 1000);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 15 * 60 * 1000);
  });

  it('follows whatever lifetime was configured (30 days for a refresh token)', async () => {
    const token = await jwt.signAsync({ sub: 'u1' }, { secret: 'test', expiresIn: '30d' });
    expect(tokenLifetimeMs(token)).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('returns undefined for something that is not a token, so callers fall back to their default', () => {
    expect(tokenLifetimeMs('not-a-token')).toBeUndefined();
    expect(tokenExpiresAt('')).toBeUndefined();
    expect(tokenLifetimeMs('a.b.c')).toBeUndefined();
  });

  it('returns undefined when the token has no expiry', async () => {
    const token = await jwt.signAsync({ sub: 'u1' }, { secret: 'test' });
    expect(tokenLifetimeMs(token)).toBeUndefined();
  });
});
