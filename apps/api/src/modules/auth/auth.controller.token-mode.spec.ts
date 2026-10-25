import { AuthController } from './auth.controller';

const result = {
  accessToken: 'access.jwt.token',
  refreshToken: 'refresh.jwt.token',
  expiresIn: 900,
  user: { id: 'u1', email: 'a@b.com', name: 'A', avatar: null, role: 'USER', provider: 'LOCAL' },
} as any;

function makeController(settings: Record<string, any>, authService: any = {}) {
  const config = { get: (key: string, fallback?: any) => settings[key] ?? fallback } as any;
  return new AuthController(authService, config);
}

function makeRes() {
  return { cookie: jest.fn(), clearCookie: jest.fn(), redirect: jest.fn() } as any;
}

describe('AuthController: cookie mode (web app on the same address)', () => {
  it('sets HttpOnly cookies and returns only the user', async () => {
    const authService = { register: jest.fn().mockResolvedValue(result) };
    const res = makeRes();
    const out = await makeController({ NODE_ENV: 'production' }, authService).register({} as any, res);

    expect(out).toEqual({ user: result.user });
    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.cookie.mock.calls[0][2]).toMatchObject({ httpOnly: true, secure: true });
  });

  it('redirects OAuth sign-ins to the dashboard after setting cookies', async () => {
    const authService = { googleLogin: jest.fn().mockResolvedValue(result) };
    const res = makeRes();
    await makeController({ 'app.frontendUrl': 'https://app.example.com/' }, authService).googleCallback({} as any, res);

    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.redirect).toHaveBeenCalledWith('https://app.example.com/dashboard');
  });
});

describe('AuthController: token mode (web app on another address, e.g. GitHub Pages)', () => {
  const settings = { 'app.tokenMode': true, 'app.frontendUrl': 'https://owner.github.io/repo/' };

  it('returns the tokens in the body and sets no cookies', async () => {
    const authService = {
      register: jest.fn().mockResolvedValue(result),
      login: jest.fn().mockResolvedValue(result),
      refreshToken: jest.fn().mockResolvedValue(result),
    };
    const controller = makeController(settings, authService);

    for (const call of [
      () => controller.register({} as any, makeRes()),
      () => controller.login({ id: 'u1' } as any, makeRes()),
      () => controller.refreshToken({ id: 'u1' }, { cookies: {}, body: { refreshToken: 'r' } } as any, makeRes()),
    ]) {
      const res = makeRes();
      const out: any = await (call as any)();
      expect(out.tokens).toEqual({ accessToken: 'access.jwt.token', refreshToken: 'refresh.jwt.token', expiresIn: 900 });
      expect(out.user).toEqual(result.user);
      expect(res.cookie).not.toHaveBeenCalled();
    }
  });

  it('refreshes from the refresh token in the request body', async () => {
    const authService = { refreshToken: jest.fn().mockResolvedValue(result) };
    await makeController(settings, authService).refreshToken({ id: 'u1' }, { cookies: {}, body: { refreshToken: 'from-body' } } as any, makeRes());
    expect(authService.refreshToken).toHaveBeenCalledWith('u1', 'from-body');
  });

  it('sends OAuth tokens to the web app in the URL fragment, never as cookies or a query string', async () => {
    const authService = { googleLogin: jest.fn().mockResolvedValue(result), linkedInLogin: jest.fn().mockResolvedValue(result) };
    const controller = makeController(settings, authService);

    for (const callback of [controller.googleCallback.bind(controller), controller.linkedInCallback.bind(controller)]) {
      const res = makeRes();
      await callback({} as any, res);
      const url: string = res.redirect.mock.calls[0][0];
      expect(url.startsWith('https://owner.github.io/repo/auth/callback/#')).toBe(true);
      expect(url).toContain('accessToken=access.jwt.token');
      expect(url).toContain('refreshToken=refresh.jwt.token');
      expect(url.split('#')[0]).not.toContain('token');
      expect(res.cookie).not.toHaveBeenCalled();
    }
  });
});
