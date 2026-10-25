import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

const user = { id: 'u1', email: 'a@b.com', name: 'A', avatar: null, role: 'USER', provider: 'LOCAL', isEmailVerified: false, createdAt: new Date() };

function makeStrategy(findFirst: jest.Mock) {
  const config = { get: () => 'test-secret' } as any;
  return new JwtStrategy(config, { userSession: { findFirst } } as any);
}

describe('JwtStrategy', () => {
  it('accepts a token whose session exists and returns the user', async () => {
    const findFirst = jest.fn().mockResolvedValue({ user });
    await expect(makeStrategy(findFirst).validate({ sub: 'u1', sid: 's1' })).resolves.toEqual(user);

    const where = findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({ id: 's1', userId: 'u1', user: { isActive: true } });
    expect(where.expiresAt.gt).toBeInstanceOf(Date);
  });

  it('rejects the token once the session is gone (logout, password change, deactivation)', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    await expect(makeStrategy(findFirst).validate({ sub: 'u1', sid: 's1' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token that is not bound to a session, without touching the database', async () => {
    const findFirst = jest.fn();
    await expect(makeStrategy(findFirst).validate({ sub: 'u1' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('never returns more than the safe user fields', async () => {
    const findFirst = jest.fn().mockResolvedValue({ user });
    await makeStrategy(findFirst).validate({ sub: 'u1', sid: 's1' });
    const select = findFirst.mock.calls[0][0].select.user.select;
    expect(select).not.toHaveProperty('password');
  });
});
