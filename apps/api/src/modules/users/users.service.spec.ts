import { UsersService, ownAvatarKey } from './users.service';

const USER = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';

describe('ownAvatarKey', () => {
  it('accepts the user\'s own avatar object, with or without a bucket prefix (path-style URLs)', () => {
    expect(ownAvatarKey(`/avatars/${USER}/a.png`, USER)).toBe(`avatars/${USER}/a.png`);
    expect(ownAvatarKey(`/bucket/avatars/${USER}/a.png`, USER)).toBe(`avatars/${USER}/a.png`);
  });

  it('rejects keys outside the user\'s avatar folder', () => {
    expect(ownAvatarKey(`/resumes/${OTHER}/secret.pdf`, USER)).toBeNull();
    expect(ownAvatarKey(`/avatars/${OTHER}/a.png`, USER)).toBeNull();
    expect(ownAvatarKey(`/xavatars/${USER}/a.png`, USER)).toBeNull();
    expect(ownAvatarKey(`/avatars/${USER}/`, USER)).toBeNull();
    expect(ownAvatarKey(`/avatars/${USER}/../../resumes/${OTHER}/x.pdf`, USER)).toBeNull();
  });
});

function setup(prismaOverrides: any = {}) {
  const prisma: any = {
    user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    resume: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn() },
    coachingSession: { deleteMany: jest.fn() },
    roadmap: { deleteMany: jest.fn() },
    recommendation: { deleteMany: jest.fn() },
    analysis: { deleteMany: jest.fn() },
    job: { deleteMany: jest.fn() },
    notification: { deleteMany: jest.fn() },
    authToken: { deleteMany: jest.fn() },
    oAuthAccount: { deleteMany: jest.fn() },
    userSession: { deleteMany: jest.fn() },
    $transaction: jest.fn().mockResolvedValue([]),
    ...prismaOverrides,
  };
  const storage = { getSignedUrl: jest.fn().mockResolvedValue('https://signed'), deleteFile: jest.fn().mockResolvedValue(undefined) };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  return { service: new UsersService(prisma, storage as any, audit as any), prisma, storage, audit };
}

describe('UsersService.getAvatarRedirectUrl', () => {
  it('signs the user\'s own S3 avatar', async () => {
    const { service, prisma, storage } = setup();
    prisma.user.findUnique.mockResolvedValue({ avatar: `https://b.s3.us-east-1.amazonaws.com/avatars/${USER}/a.png` });
    await expect(service.getAvatarRedirectUrl(USER)).resolves.toBe('https://signed');
    expect(storage.getSignedUrl).toHaveBeenCalledWith(`avatars/${USER}/a.png`, 3600);
  });

  it('does not sign a key that points at someone else\'s file', async () => {
    const { service, prisma, storage } = setup();
    const avatar = `https://b.s3.us-east-1.amazonaws.com/resumes/${OTHER}/secret.pdf`;
    prisma.user.findUnique.mockResolvedValue({ avatar });
    await expect(service.getAvatarRedirectUrl(USER)).resolves.toBe(avatar);
    expect(storage.getSignedUrl).not.toHaveBeenCalled();
  });
});

describe('UsersService.deleteAccount', () => {
  it('deletes stored files and the user\'s data, and anonymises the account', async () => {
    const { service, prisma, storage, audit } = setup();
    prisma.resume.findMany.mockResolvedValue([{ fileKey: `resumes/${USER}/1.pdf` }, { fileKey: `resumes/${USER}/2.docx` }]);
    prisma.user.findUnique.mockResolvedValue({ avatar: `https://b.s3.us-east-1.amazonaws.com/avatars/${USER}/a.png` });

    await expect(service.deleteAccount(USER)).resolves.toEqual({ message: 'Account deleted successfully' });

    expect(storage.deleteFile.mock.calls.map((c) => c[0]).sort()).toEqual(
      [`avatars/${USER}/a.png`, `resumes/${USER}/1.pdf`, `resumes/${USER}/2.docx`].sort(),
    );
    for (const table of ['coachingSession', 'roadmap', 'recommendation', 'analysis', 'resume', 'job', 'notification', 'authToken', 'oAuthAccount', 'userSession']) {
      expect(prisma[table].deleteMany).toHaveBeenCalledWith({ where: { userId: USER } });
    }
    const update = prisma.user.update.mock.calls[0][0];
    expect(update.data).toMatchObject({ isActive: false, name: 'Deleted user', avatar: null, password: null });
    expect(update.data.email).toMatch(/^deleted_\d+_.*@deleted\.com$/);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'user.delete_account' }));
  });
});
