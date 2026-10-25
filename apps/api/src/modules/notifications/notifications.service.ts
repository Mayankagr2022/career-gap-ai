import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: CreateNotificationInput) {
    return this.prisma.notification.create({
      data,
    });
  }

  /**
   * Fire-and-forget for background jobs: telling the user about a result must never fail
   * (or roll back) the work that produced it.
   */
  async notify(data: CreateNotificationInput): Promise<void> {
    try {
      await this.create(data);
    } catch (error: any) {
      this.logger.warn(`Could not create notification "${data.title}": ${error?.message ?? error}`);
    }
  }

  async findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string, userId: string) {
    // updateMany scopes to the owner and reports "not found" cleanly instead of a Prisma error (HTTP 500)
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    if (count === 0) throw new NotFoundException('Notification not found');
    return { id, isRead: true };
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
