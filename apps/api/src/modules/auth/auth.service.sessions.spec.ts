import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { tokenExpiresAt } from './token-lifetime';

const decode = (token: string) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));

function makeService() {
  const created: any[] = [];
  const prisma = {
    userSession: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockImplementation(({ data }) => {
        created.push(data);
        return Promise.resolve(data);
      }),
    },
  };
  const values: Record<string, string> = {
    'jwt.secret': 'access-secret',
    'jwt.refreshSecret': 'refresh-secret',
    'jwt.expiresIn': '15m',
    'jwt.refreshExpiresIn': '30d',
  };
  const config = { get: (key: string, fallback?: string) => values[key] ?? fallback } as any;
  const service = new AuthService(prisma as any, new JwtService({}), config, {} as any, {} as any, {} as any);
  return { service, prisma, created };
}

const user = { id: 'u1', email: 'a@b.com', role: 'USER', name: 'A', avatar: null, provider: 'LOCAL' } as any;

describe('AuthService token issuing', () => {
  it('binds both tokens to the session that is stored for them', async () => {
    const { service, created } = makeService();
    const tokens = await (service as any).generateTokens(user);

    expect(created).toHaveLength(1);
    const sessionId = created[0].id;
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(decode(tokens.accessToken).sid).toBe(sessionId);
    expect(decode(tokens.refreshToken).sid).toBe(sessionId);
  });

  it('gives every login its own session', async () => {
    const { service, created } = makeService();
    await (service as any).generateTokens(user);
    await (service as any).generateTokens(user);
    expect(created[0].id).not.toBe(created[1].id);
  });

  it('stores the session until the refresh token expires, and reports the real access token lifetime', async () => {
    const { service, created } = makeService();
    const tokens = await (service as any).generateTokens(user);

    expect(created[0].expiresAt.getTime()).toBe(tokenExpiresAt(tokens.refreshToken));
    expect(tokens.expiresIn).toBe(15 * 60);
  });
});
