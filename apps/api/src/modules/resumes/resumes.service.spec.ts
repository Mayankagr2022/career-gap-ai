import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ResumesService } from './resumes.service';

function makeService(prisma: any, storage: any = {}) {
  return new ResumesService(prisma, storage, {} as any, { add: jest.fn() } as any);
}

describe('ResumesService (read paths)', () => {
  it('findAll returns a skills preview instead of the full parsed resume', async () => {
    const skills = ['ts', 'node', 'sql', 'aws', 'docker', 'k8s'];
    const findMany = jest.fn().mockResolvedValue([
      { id: 'r1', originalName: 'cv.pdf', status: 'ANALYZED', parsedData: { skills, experience: [{ big: 'x' }] } },
      { id: 'r2', originalName: 'new.pdf', status: 'PROCESSING', parsedData: null },
    ]);
    const out = await makeService({ resume: { findMany } }).findAll('user-1');

    expect(out[0]).not.toHaveProperty('parsedData');
    expect(out[0]).toMatchObject({ id: 'r1', skills: ['ts', 'node', 'sql', 'aws'], skillCount: 6 });
    expect(out[1]).toMatchObject({ id: 'r2', skills: [], skillCount: 0 });
  });

  describe('findOne', () => {
    const row = { id: 'r1', userId: 'user-1', originalName: 'cv.pdf', parsedData: { name: 'Jane' }, analyses: [] };

    it('returns parsed data but not the owner id, raw text or file key', async () => {
      const findUnique = jest.fn().mockResolvedValue(row);
      const out = await makeService({ resume: { findUnique } }).findOne('r1', 'user-1');

      expect(out).toMatchObject({ id: 'r1', parsedData: { name: 'Jane' } });
      expect(out).not.toHaveProperty('userId');
      const select = findUnique.mock.calls[0][0].select;
      for (const hidden of ['rawText', 'fileKey', 'fileUrl']) expect(select).not.toHaveProperty(hidden);
    });

    it('404s for a missing resume and 403s for someone else', async () => {
      await expect(
        makeService({ resume: { findUnique: jest.fn().mockResolvedValue(null) } }).findOne('r1', 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        makeService({ resume: { findUnique: jest.fn().mockResolvedValue(row) } }).findOne('r1', 'other'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  it('delete uses the light ownership lookup, removes the file, then the row', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'r1', userId: 'user-1', fileKey: 'k/1.pdf' });
    const del = jest.fn().mockResolvedValue({});
    const deleteFile = jest.fn().mockResolvedValue(undefined);
    const svc = makeService({ resume: { findUnique, delete: del } }, { deleteFile });

    await expect(svc.delete('r1', 'user-1')).resolves.toEqual({ message: 'Resume deleted successfully' });
    expect(findUnique.mock.calls[0][0].select).toEqual({ id: true, userId: true, fileKey: true });
    expect(deleteFile).toHaveBeenCalledWith('k/1.pdf');
    expect(del).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });

  it('delete refuses someone else\'s resume without touching storage', async () => {
    const deleteFile = jest.fn();
    const findUnique = jest.fn().mockResolvedValue({ id: 'r1', userId: 'user-1', fileKey: 'k' });
    const svc = makeService({ resume: { findUnique, delete: jest.fn() } }, { deleteFile });
    await expect(svc.delete('r1', 'intruder')).rejects.toBeInstanceOf(ForbiddenException);
    expect(deleteFile).not.toHaveBeenCalled();
  });
});
