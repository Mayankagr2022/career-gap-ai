import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, analysisId?: string) {
    return this.prisma.recommendation.findMany({
      where: { userId, ...(analysisId ? { analysisId } : {}) },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, userId: string) {
    const rec = await this.prisma.recommendation.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException('Recommendation not found');
    if (rec.userId !== userId) throw new ForbiddenException('Access denied');
    return rec;
  }

  async markComplete(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.recommendation.update({
      where: { id },
      data: { isCompleted: true, completedAt: new Date() },
    });
  }

  async markIncomplete(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.recommendation.update({
      where: { id },
      data: { isCompleted: false, completedAt: null },
    });
  }

  async getStats(userId: string) {
    const [total, completed, byType] = await Promise.all([
      this.prisma.recommendation.count({ where: { userId } }),
      this.prisma.recommendation.count({ where: { userId, isCompleted: true } }),
      this.prisma.recommendation.groupBy({
        by: ['type'],
        where: { userId },
        _count: { type: true },
      }),
    ]);

    return {
      total,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      byType: byType.map((t) => ({ type: t.type, count: t._count.type })),
    };
  }
}
