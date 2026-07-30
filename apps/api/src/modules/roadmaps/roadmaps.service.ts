import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RoadmapsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.roadmap.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        targetRole: true,
        targetDate: true,
        completionPct: true,
        createdAt: true,
        milestones: true,
        analysis: {
          select: {
            matchScore: true,
            job: { select: { title: true, company: true } },
          },
        },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const roadmap = await this.prisma.roadmap.findUnique({
      where: { id },
      include: {
        analysis: {
          include: {
            job: { select: { title: true, company: true } },
            resume: { select: { originalName: true } },
          },
        },
      },
    });

    if (!roadmap) throw new NotFoundException('Roadmap not found');
    if (roadmap.userId !== userId) throw new ForbiddenException('Access denied');

    return roadmap;
  }

  async updateMilestoneTask(
    roadmapId: string,
    userId: string,
    milestoneId: string,
    taskId: string,
    completed: boolean,
  ) {
    const roadmap = await this.findOne(roadmapId, userId);
    const milestones = roadmap.milestones as any[];

    let totalTasks = 0;
    let completedTasks = 0;

    const updatedMilestones = milestones.map((milestone: any) => {
      if (milestone.id === milestoneId) {
        const updatedTasks = milestone.tasks.map((task: any) => {
          totalTasks++;
          const isTarget = task.id === taskId;
          const isCompleted = isTarget ? completed : task.completed;
          if (isCompleted) completedTasks++;
          return isTarget ? { ...task, completed } : task;
        });

        const milestoneCompleted = updatedTasks.every((t: any) => t.completed);
        return { ...milestone, tasks: updatedTasks, completed: milestoneCompleted };
      }

      // Count other milestones
      milestone.tasks?.forEach((t: any) => {
        totalTasks++;
        if (t.completed) completedTasks++;
      });

      return milestone;
    });

    const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return this.prisma.roadmap.update({
      where: { id: roadmapId },
      data: {
        milestones: updatedMilestones as any,
        completionPct,
      },
    });
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.roadmap.update({ where: { id }, data: { isActive: false } });
    return { message: 'Roadmap deleted' };
  }
}
