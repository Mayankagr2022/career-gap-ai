import { Injectable } from '@nestjs/common';
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
  constructor(private prisma: PrismaService) {}

  async create(data: CreateNotificationInput) {
    return this.prisma.notification.create({
      data,
    });
  }

  async findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.update({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
