import { ConflictException } from '@nestjs/common';
import { JobsService } from './jobs.service';

const USER = 'user-1';

const existing = {
  id: 'job-1',
  userId: USER,
  isActive: true,
  title: 'Dev',
  company: 'Acme',
  description: 'old description '.repeat(10),
  sourceFilename: null,
  location: null,
  remote: false,
  skills: [],
  analyses: [],
};

function setup() {
  const prisma: any = {
    job: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(existing),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...existing, ...data, skills: [] })),
    },
    jobSkill: { deleteMany: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn().mockImplementation((ops: any[]) => Promise.all(ops)),
  };
  const parser = {
    parse: jest.fn().mockResolvedValue({
      requiredSkills: ['Node.js'],
      preferredSkills: [],
      experienceLevel: '3-5 years',
      jobType: 'FULL_TIME',
    }),
  };
  const skills = { resolveMany: jest.fn().mockResolvedValue(new Map([['nodejs', { id: 'skill-1' }]])) };
  const service = new JobsService(prisma, {} as any, parser as any, skills as any, {} as any, {} as any, {} as any);
  return { service, prisma, parser };
}

describe('JobsService.update with a new description', () => {
  it('re-parses, replaces the skills and updates the parsed fields', async () => {
    const { service, parser, prisma } = setup();
    const description = 'Build and run APIs with Node.js and PostgreSQL. '.repeat(5);
    await service.update('job-1', USER, { description } as any);

    expect(parser.parse).toHaveBeenCalledWith(description.trim(), 'Dev', 'Acme');
    expect(prisma.jobSkill.deleteMany).toHaveBeenCalledWith({ where: { jobId: 'job-1' } });
    const data = prisma.job.update.mock.calls[0][0].data;
    expect(data.skills.create).toEqual([{ skillId: 'skill-1', importance: 'REQUIRED' }]);
    expect(data.experienceLevel).toBe('3-5 years');
  });

  it('rejects a description that duplicates another job of the user, excluding the job itself', async () => {
    const { service, prisma } = setup();
    prisma.job.findFirst.mockResolvedValue({ id: 'other' });
    await expect(service.update('job-1', USER, { description: 'x'.repeat(120) } as any)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.job.findFirst.mock.calls[0][0].where.id).toEqual({ not: 'job-1' });
  });

  it('does not call the AI when only the title changes', async () => {
    const { service, parser } = setup();
    await service.update('job-1', USER, { title: 'Senior Dev' } as any);
    expect(parser.parse).not.toHaveBeenCalled();
  });
});
