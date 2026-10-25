import { JwtService } from '@nestjs/jwt';
import { AuthProvider } from '@prisma/client';
import { AuthService, REFRESH_ROTATION_GRACE_MS } from './auth.service';

const user = { id: 'u1', email: 'a@b.com', role: 'USER', name: 'A', avatar: null, provider: 'LOCAL', isActive: true } as any;

function makeService(prismaOverrides: any = {}) {
  const prisma: any = {
    userSession: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({}),
    },
    user: { findUnique: jest.fn(), update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...user, ...data })), create: jest.fn() },
    oAuthAccount: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
    authToken: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    $transaction: jest.fn().mockResolvedValue([]),
    ...prismaOverrides,
  };
  const values: Record<string, string> = {
    'jwt.secret': 's1',
    'jwt.refreshSecret': 's2',
    'jwt.expiresIn': '15m',
    'jwt.refreshExpiresIn': '30d',
  };
  const config = { get: (k: string, f?: string) => values[k] ?? f } as any;
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new AuthService(prisma, new JwtService({}), config, {} as any, {} as any, audit as any);
  return { service, prisma };
}



describe('refresh token rotation', () => {
  it('keeps the old refresh token valid only for a short grace window instead of deleting it', async () => {
    const { service, prisma } = makeService();
    prisma.userSession.findFirst.mockResolvedValue({
      id: 's1',
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
      user,
    });

    const before = Date.now();
    await service.refreshToken('u1', 'old-token');

    expect(prisma.userSession.delete).not.toHaveBeenCalled();
    const { data } = prisma.userSession.update.mock.calls[0][0];
    expect(data.expiresAt.getTime()).toBeGreaterThanOrEqual(before + REFRESH_ROTATION_GRACE_MS);
    expect(data.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + REFRESH_ROTATION_GRACE_MS);
  });

  it('lets two simultaneous refreshes with the same token both succeed', async () => {
    const { service, prisma } = makeService();
    prisma.userSession.findFirst.mockResolvedValue({ id: 's1', expiresAt: new Date(Date.now() + 10_000), user });

    const [a, b] = await Promise.all([service.refreshToken('u1', 't'), service.refreshToken('u1', 't')]);
    expect(a.accessToken).toBeTruthy();
    expect(b.accessToken).toBeTruthy();
    expect(a.refreshToken).not.toBe(b.refreshToken);
    // already inside the grace window: never extended
    expect(prisma.userSession.update).not.toHaveBeenCalled();
  });

  it('rejects an unknown or expired refresh token', async () => {
    const { service, prisma } = makeService();
    prisma.userSession.findFirst.mockResolvedValue(null);
    await expect(service.refreshToken('u1', 'x')).rejects.toThrow('Invalid or expired refresh token');
  });
});

describe('OAuth login linking to an existing account', () => {
  const login = (service: AuthService) =>
    (service as any).handleOAuthLogin({
      email: 'a@b.com',
      name: 'A',
      provider: AuthProvider.GOOGLE,
      providerId: 'g-1',
    });

  it('clears the password, sessions and reset tokens of an unverified local account (pre-registration takeover)', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue({ ...user, password: 'attacker-hash', isEmailVerified: false });

    await login(service);

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { password: null } });
    expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(prisma.authToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(prisma.oAuthAccount.create).toHaveBeenCalled();
  });

  it('leaves a verified account untouched', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue({ ...user, password: 'hash', isEmailVerified: true });

    await login(service);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.authToken.deleteMany).not.toHaveBeenCalled();
  });
});
