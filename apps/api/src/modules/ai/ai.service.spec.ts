import { HttpException } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiProvider } from './providers/ai-provider';

const quotaError = () =>
  Object.assign(new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","message":"PerDay quota"}}'), { status: 429 });
const badRequest = () => Object.assign(new Error('bad prompt'), { status: 400 });

function fakeProvider(name: string, impl: () => Promise<string>): AiProvider & { calls: number } {
  const p = {
    name,
    defaultModel: `${name}-model`,
    calls: 0,
    isConfigured: () => true,
    generate: jest.fn(async () => {
      p.calls++;
      return { text: await impl(), model: `${name}-model` };
    }),
    stream: jest.fn(),
  };
  return p as any;
}

function makeService(providers: AiProvider[]) {
  const config = { get: (_k: string, d?: any) => (_k === 'ai.providerOrder' ? [] : d) } as any;
  const prisma = { aiUsageLog: { create: jest.fn().mockResolvedValue({}) } } as any;
  const svc = new AiService(config, prisma);
  svc.providers = providers;
  return svc;
}

describe('AiService failover', () => {
  it('uses the first provider when it works', async () => {
    const a = fakeProvider('gemini', async () => 'a');
    const b = fakeProvider('openai', async () => 'b');
    await expect(makeService([a, b]).chat([{ role: 'user', content: 'hi' }])).resolves.toBe('a');
    expect(b.calls).toBe(0);
  });

  it('falls back when the first provider quota is exhausted, without retrying it', async () => {
    const a = fakeProvider('gemini', async () => { throw quotaError(); });
    const b = fakeProvider('openai', async () => 'b');
    await expect(makeService([a, b]).chat([{ role: 'user', content: 'hi' }])).resolves.toBe('b');
    expect(a.calls).toBe(1);
  });

  it('skips an exhausted provider during the cooldown', async () => {
    const a = fakeProvider('gemini', async () => { throw quotaError(); });
    const b = fakeProvider('openai', async () => 'b');
    const svc = makeService([a, b]);
    await svc.chat([{ role: 'user', content: 'hi' }]);
    await svc.chat([{ role: 'user', content: 'hi' }]);
    expect(a.calls).toBe(1);
    expect(b.calls).toBe(2);
  });

  it('throws 503 when every provider hits quota', async () => {
    const mk = (n: string) => fakeProvider(n, async () => { throw quotaError(); });
    const svc = makeService([mk('gemini'), mk('openai')]);
    await expect(svc.chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({ status: 503 });
    await expect(svc.chat([{ role: 'user', content: 'hi' }])).rejects.toBeInstanceOf(HttpException);
  });

  it('does not fail over on a 400 request error', async () => {
    const a = fakeProvider('gemini', async () => { throw badRequest(); });
    const b = fakeProvider('openai', async () => 'b');
    await expect(makeService([a, b]).chat([{ role: 'user', content: 'hi' }])).rejects.toThrow('bad prompt');
    expect(b.calls).toBe(0);
  });

  it('fails over when a provider rejects its API key with a 400', async () => {
    const a = fakeProvider('gemini', async () => {
      throw Object.assign(new Error('{"error":{"code":400,"message":"API key not valid."}}'), { status: 400 });
    });
    const b = fakeProvider('openai', async () => 'b');
    await expect(makeService([a, b]).chat([{ role: 'user', content: 'hi' }])).resolves.toBe('b');
  });

  it('retries invalid JSON on the same provider, then fails over', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick'] });
    const a = fakeProvider('gemini', async () => 'not json');
    const b = fakeProvider('openai', async () => '```json\n{"ok":true}\n```');
    const promise = makeService([a, b]).chatWithJson<{ ok: boolean }>([{ role: 'user', content: 'hi' }]);
    await jest.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ ok: true });
    expect(a.calls).toBe(2);
    jest.useRealTimers();
  });

  it('throws 503 when no provider is configured', async () => {
    await expect(makeService([]).chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({ status: 503 });
  });
});
