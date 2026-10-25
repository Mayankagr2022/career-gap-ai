import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

const milestonesInclude = {
  milestones: {
    orderBy: { position: 'asc' },
    include: { tasks: { orderBy: { position: 'asc' } } },
  },
} satisfies Prisma.RoadmapInclude;

type RoadmapWithMilestones = Prisma.RoadmapGetPayload<{ include: typeof milestonesInclude }>;

/** Shape milestones/tasks the way the API has always returned them (week, completed flags). */
export function toRoadmapDto<T extends RoadmapWithMilestones>(roadmap: T) {
  return {
    ...roadmap,
    milestones: roadmap.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      week: m.weekNumber,
      completed: m.tasks.length > 0 && m.tasks.every((t) => t.isCompleted),
      tasks: m.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        type: t.type,
        url: t.url,
        completed: t.isCompleted,
      })),
    })),
  };
}

@Injectable()
export class RoadmapsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const roadmaps = await this.prisma.roadmap.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        ...milestonesInclude,
        analysis: {
          select: {
            matchScore: true,
            job: { select: { title: true, company: true } },
          },
        },
      },
    });
    return roadmaps.map(toRoadmapDto);
  }

  async findOne(id: string, userId: string) {
    const roadmap = await this.prisma.roadmap.findUnique({
      where: { id },
      include: {
        ...milestonesInclude,
        analysis: {
          select: {
            id: true,
            status: true,
            matchScore: true,
            atsScore: true,
            job: { select: { title: true, company: true } },
            resume: { select: { originalName: true } },
          },
        },
      },
    });

    if (!roadmap || !roadmap.isActive) throw new NotFoundException('Roadmap not found');
    if (roadmap.userId !== userId) throw new ForbiddenException('Access denied');

    return toRoadmapDto(roadmap);
  }

  /** Ownership check without loading milestones, tasks or the analysis. */
  private async assertOwned(id: string, userId: string) {
    const roadmap = await this.prisma.roadmap.findUnique({
      where: { id },
      select: { userId: true, isActive: true },
    });
    if (!roadmap || !roadmap.isActive) throw new NotFoundException('Roadmap not found');
    if (roadmap.userId !== userId) throw new ForbiddenException('Access denied');
  }

  async updateMilestoneTask(
    roadmapId: string,
    userId: string,
    milestoneId: string,
    taskId: string,
    completed: boolean,
  ) {
    await this.assertOwned(roadmapId, userId);

    const task = await this.prisma.roadmapTask.findFirst({
      where: { id: taskId, milestoneId, milestone: { roadmapId } },
    });
    if (!task) throw new NotFoundException('Task not found');

    const { completionPct, milestoneCompleted } = await this.prisma.$transaction(async (tx) => {
      await tx.roadmapTask.update({
        where: { id: taskId },
        data: { isCompleted: completed, completedAt: completed ? new Date() : null },
      });

      const [total, done, openInMilestone] = await Promise.all([
        tx.roadmapTask.count({ where: { milestone: { roadmapId } } }),
        tx.roadmapTask.count({ where: { milestone: { roadmapId }, isCompleted: true } }),
        tx.roadmapTask.count({ where: { milestoneId, isCompleted: false } }),
      ]);

      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      await tx.roadmap.update({ where: { id: roadmapId }, data: { completionPct: pct } });
      return { completionPct: pct, milestoneCompleted: openInMilestone === 0 };
    });

    // Just what changed; the client updates its cached roadmap instead of re-downloading the whole tree
    return { roadmapId, milestoneId, taskId, completed, milestoneCompleted, completionPct };
  }

  async delete(id: string, userId: string) {
    await this.assertOwned(id, userId);
    await this.prisma.roadmap.update({ where: { id }, data: { isActive: false } });
    return { message: 'Roadmap deleted' };
  }
}
