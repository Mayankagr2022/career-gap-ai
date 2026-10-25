import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('liveness does not touch the database', () => {
    const queryRaw = jest.fn();
    const controller = new HealthController({ $queryRaw: queryRaw } as any);
    expect(controller.live()).toEqual({ status: 'ok' });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('readiness reports the database as up', async () => {
    const controller = new HealthController({ $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } as any);
    await expect(controller.ready()).resolves.toEqual({ status: 'ok', database: 'up' });
  });

  it('readiness returns 503 when the database is unreachable', async () => {
    const controller = new HealthController({ $queryRaw: jest.fn().mockRejectedValue(new Error('connection refused')) } as any);
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
