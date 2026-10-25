import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoadmapsService } from './roadmaps.service';

/** Prisma double whose $transaction runs the callback against the same mocks. */
function makePrisma(overrides: any = {}) {
  const tx = {
    roadmapTask: {
      update: jest.fn().mockResolvedValue({}),
      // total, done, open-in-milestone
      count: jest.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(3).mockResolvedValueOnce(0),
    },
    roadmap: { update: jest.fn().mockResolvedValue({}) },
  };
  const prisma: any = {
    roadmap: { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1', isActive: true }), update: jest.fn() },
    roadmapTask: { findFirst: jest.fn().mockResolvedValue({ id: 't1' }) },
    $transaction: jest.fn((fn: any) => fn(tx)),
    ...overrides,
  };
  return { prisma, tx };
}

describe('RoadmapsService', () => {
  describe('updateMilestoneTask', () => {
    it('returns only what changed and never reloads the roadmap tree', async () => {
      const { prisma, tx } = makePrisma();
      const out = await new RoadmapsService(prisma).updateMilestoneTask('rm1', 'user-1', 'm1', 't1', true);

      expect(out).toEqual({
        roadmapId: 'rm1',
        milestoneId: 'm1',
        taskId: 't1',
        completed: true,
        milestoneCompleted: true,
        completionPct: 75,
      });
      expect(tx.roadmap.update).toHaveBeenCalledWith({ where: { id: 'rm1' }, data: { completionPct: 75 } });
      // ownership check is the light select, once; the tree is not loaded before or after
      expect(prisma.roadmap.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.roadmap.findUnique.mock.calls[0][0].include).toBeUndefined();
    });

    it('rejects an unknown task', async () => {
      const { prisma } = makePrisma({ roadmapTask: { findFirst: jest.fn().mockResolvedValue(null) } });
      await expect(new RoadmapsService(prisma).updateMilestoneTask('rm1', 'user-1', 'm1', 'nope', true)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("rejects someone else's roadmap before touching tasks", async () => {
      const { prisma } = makePrisma();
      await expect(new RoadmapsService(prisma).updateMilestoneTask('rm1', 'intruder', 'm1', 't1', true)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.roadmapTask.findFirst).not.toHaveBeenCalled();
    });
  });

  it('delete soft-deletes after the light ownership check', async () => {
    const { prisma } = makePrisma();
    await expect(new RoadmapsService(prisma).delete('rm1', 'user-1')).resolves.toEqual({ message: 'Roadmap deleted' });
    expect(prisma.roadmap.findUnique.mock.calls[0][0].include).toBeUndefined();
    expect(prisma.roadmap.update).toHaveBeenCalledWith({ where: { id: 'rm1' }, data: { isActive: false } });
  });
});
