import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { JobsService } from './jobs.service';

const USER = 'user-1';
const LONG_TEXT = `Job Title: Backend Engineer\nCompany: Acme\n${'Build and run APIs with Node.js and PostgreSQL. '.repeat(5)}`;

function makeFile(content: string | Buffer, name = 'jd.txt'): Express.Multer.File {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return { buffer, size: buffer.length, originalname: name } as Express.Multer.File;
}

function setup() {
  const prisma = {
    job: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'job-1', ...data, skills: [] })),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const parser = {
    parse: jest.fn().mockResolvedValue({
      requiredSkills: ['Node.js'],
      preferredSkills: [],
      location: 'Berlin',
      remote: true,
      salaryRange: { min: 90000, max: 120000, currency: 'EUR' },
      experienceLevel: '3-5 years',
      jobType: 'FULL_TIME',
    }),
  };
  const skills = { resolveMany: jest.fn().mockResolvedValue(new Map([['nodejs', { id: 'skill-1' }]])) };
  const documents = { extractText: jest.fn().mockImplementation((b: Buffer) => Promise.resolve(b.toString('utf8'))) };
  const drafts = {
    save: jest.fn().mockResolvedValue('draft-1'),
    get: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const notifications = { notify: jest.fn().mockResolvedValue(undefined) };
  const service = new JobsService(prisma as any, {} as any, parser as any, skills as any, documents as any, drafts as any, notifications as any);
  return { service, prisma, parser, skills, documents, drafts, notifications };
}

describe('JobsService file upload', () => {
  describe('uploadFile', () => {
    it('stores a draft and returns rule-based title and company without calling the AI', async () => {
      const { service, parser, drafts } = setup();
      const result = await service.uploadFile(USER, makeFile(LONG_TEXT, 'backend.txt'));

      expect(parser.parse).not.toHaveBeenCalled();
      expect(drafts.save).toHaveBeenCalledWith(USER, { text: LONG_TEXT.trim(), filename: 'backend.txt' });
      expect(result).toMatchObject({
        draftId: 'draft-1',
        title: 'Backend Engineer',
        company: 'Acme',
        filename: 'backend.txt',
      });
      expect(result.description).toBe(LONG_TEXT.trim());
    });

    it('returns null title and company when nothing can be detected', async () => {
      const { service } = setup();
      const prose = 'We are looking for someone great to join the team and do very many interesting things. '.repeat(3);
      const result = await service.uploadFile(USER, makeFile(prose));
      expect(result.title).toBeNull();
      expect(result.company).toBeNull();
    });

    it('rejects a missing, empty, oversized or unsupported file', async () => {
      const { service } = setup();
      await expect(service.uploadFile(USER, undefined as any)).rejects.toThrow(BadRequestException);
      await expect(service.uploadFile(USER, makeFile(''))).rejects.toThrow('empty');
      await expect(service.uploadFile(USER, { ...makeFile('x'), size: 6 * 1024 * 1024 })).rejects.toThrow('5MB');
      await expect(service.uploadFile(USER, makeFile(Buffer.from([0x89, 0x50, 0x00, 0x01])))).rejects.toThrow(
        'Only PDF, DOCX and TXT',
      );
    });

    it('rejects text that is too short or too long', async () => {
      const { service } = setup();
      await expect(service.uploadFile(USER, makeFile('Too short to be a job description at all.'))).rejects.toThrow(
        "doesn't look like a complete job description",
      );
      await expect(service.uploadFile(USER, makeFile('word '.repeat(5000)))).rejects.toThrow('too long');
    });

    it('rejects a description the user already added', async () => {
      const { service, prisma, drafts } = setup();
      prisma.job.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.uploadFile(USER, makeFile(LONG_TEXT))).rejects.toThrow(ConflictException);
      expect(drafts.save).not.toHaveBeenCalled();
    });
  });

  describe('confirmUpload', () => {
    const dto = { title: 'Senior Backend Engineer', company: 'Acme Corp' };

    it('runs the AI parse on the stored text and saves with the confirmed title and company', async () => {
      const { service, prisma, parser, drafts } = setup();
      drafts.get.mockResolvedValue({ text: LONG_TEXT, filename: 'backend.txt' });

      await service.confirmUpload(USER, 'draft-1', dto);

      expect(parser.parse).toHaveBeenCalledTimes(1);
      expect(parser.parse).toHaveBeenCalledWith(LONG_TEXT, dto.title, dto.company);
      const data = prisma.job.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        userId: USER,
        title: dto.title,
        company: dto.company,
        description: LONG_TEXT,
        location: 'Berlin',
        remote: true,
        salaryMin: 90000,
        salaryMax: 120000,
        salaryCurrency: 'EUR',
        sourceFilename: 'backend.txt',
      });
      expect(drafts.remove).toHaveBeenCalledWith(USER, 'draft-1');
    });

    it('notifies the user that the job was added, and not when the parse fails', async () => {
      const ok = setup();
      ok.drafts.get.mockResolvedValue({ text: LONG_TEXT, filename: 'backend.txt' });
      await ok.service.confirmUpload(USER, 'draft-1', dto);
      expect(ok.notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER, title: 'Job Added', type: 'SUCCESS', link: '/dashboard/jobs' }),
      );

      const failed = setup();
      failed.drafts.get.mockResolvedValue({ text: LONG_TEXT, filename: 'backend.txt' });
      failed.parser.parse.mockRejectedValue(new Error('AI unavailable'));
      await expect(failed.service.confirmUpload(USER, 'draft-1', dto)).rejects.toThrow();
      expect(failed.notifications.notify).not.toHaveBeenCalled();
    });

    it('reports an expired or unknown draft', async () => {
      const { service, parser, drafts } = setup();
      drafts.get.mockResolvedValue(null);
      await expect(service.confirmUpload(USER, 'gone', dto)).rejects.toThrow(NotFoundException);
      expect(parser.parse).not.toHaveBeenCalled();
    });

    it('keeps the draft when the AI parse fails so the user can retry', async () => {
      const { service, parser, drafts, prisma } = setup();
      drafts.get.mockResolvedValue({ text: LONG_TEXT, filename: 'backend.txt' });
      parser.parse.mockRejectedValue(new Error('AI unavailable'));

      await expect(service.confirmUpload(USER, 'draft-1', dto)).rejects.toThrow('AI unavailable');
      expect(prisma.job.create).not.toHaveBeenCalled();
      expect(drafts.remove).not.toHaveBeenCalled();
    });

    it('ignores a malformed salary range from the AI', async () => {
      const { service, prisma, parser, drafts } = setup();
      drafts.get.mockResolvedValue({ text: LONG_TEXT, filename: 'backend.txt' });
      parser.parse.mockResolvedValue({ requiredSkills: [], preferredSkills: [], salaryRange: { min: 'lots' } });

      await service.confirmUpload(USER, 'draft-1', dto);
      const data = prisma.job.create.mock.calls[0][0].data;
      expect(data.salaryMin).toBeUndefined();
      expect(data.salaryMax).toBeUndefined();
    });
  });

  describe('update on uploaded jobs', () => {
    const uploaded = {
      id: 'job-1',
      userId: USER,
      isActive: true,
      description: 'original text',
      location: 'Berlin',
      remote: true,
      sourceFilename: 'jd.txt',
      skills: [],
      analyses: [],
    };

    it('allows editing title and company', async () => {
      const { service, prisma } = setup();
      prisma.job.findUnique.mockResolvedValue(uploaded);
      prisma.job.update.mockResolvedValue({ ...uploaded, title: 'New', skills: [] });
      await expect(service.update('job-1', USER, { title: 'New', company: 'Co' })).resolves.toBeDefined();
    });

    it('rejects changes to description, location or remote', async () => {
      const { service, prisma } = setup();
      prisma.job.findUnique.mockResolvedValue(uploaded);
      await expect(service.update('job-1', USER, { description: 'changed' })).rejects.toThrow(BadRequestException);
      await expect(service.update('job-1', USER, { location: 'Paris' })).rejects.toThrow(BadRequestException);
      await expect(service.update('job-1', USER, { remote: false })).rejects.toThrow(BadRequestException);
      expect(prisma.job.update).not.toHaveBeenCalled();
    });

    it('lets a pasted job edit its description as before', async () => {
      const { service, prisma, parser } = setup();
      prisma.job.findUnique.mockResolvedValue({ ...uploaded, sourceFilename: null });
      prisma.job.update.mockResolvedValue({ ...uploaded, skills: [] });
      // a changed description is parsed again and its skills replaced in one transaction
      (prisma as any).jobSkill = { deleteMany: jest.fn().mockResolvedValue({}) };
      (prisma as any).$transaction = jest.fn().mockImplementation((ops: any[]) => Promise.all(ops));
      await expect(service.update('job-1', USER, { description: 'changed' })).resolves.toBeDefined();
      expect(parser.parse).toHaveBeenCalled();
    });
  });
});
