import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('notify creates the notification', async () => {
    const create = jest.fn().mockResolvedValue({});
    const svc = new NotificationsService({ notification: { create } } as any);

    await svc.notify({ userId: 'u1', title: 'Resume Ready', message: 'ok', link: '/dashboard/resumes' });
    expect(create).toHaveBeenCalledWith({ data: { userId: 'u1', title: 'Resume Ready', message: 'ok', link: '/dashboard/resumes' } });
  });

  it('notify never throws, so a notification problem cannot fail the job that produced it', async () => {
    const create = jest.fn().mockRejectedValue(new Error('db down'));
    const svc = new NotificationsService({ notification: { create } } as any);
    await expect(svc.notify({ userId: 'u1', title: 't', message: 'm' })).resolves.toBeUndefined();
  });

  describe('markAsRead', () => {
    it('only touches the caller\'s own notification', async () => {
      const updateMany = jest.fn().mockResolvedValue({ count: 1 });
      const svc = new NotificationsService({ notification: { updateMany } } as any);

      await expect(svc.markAsRead('n1', 'u1')).resolves.toEqual({ id: 'n1', isRead: true });
      expect(updateMany).toHaveBeenCalledWith({ where: { id: 'n1', userId: 'u1' }, data: { isRead: true } });
    });

    it('404s (not a 500) when it does not exist or belongs to someone else', async () => {
      const svc = new NotificationsService({ notification: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) } } as any);
      await expect(svc.markAsRead('n1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('findAll returns the newest 50 for the user', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    await new NotificationsService({ notification: { findMany } } as any).findAll('u1');
    expect(findMany).toHaveBeenCalledWith({ where: { userId: 'u1' }, orderBy: { createdAt: 'desc' }, take: 50 });
  });
});
