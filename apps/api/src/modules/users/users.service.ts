import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcryptjs';

import { StorageService } from '../../common/storage/storage.service';
import { AuditService } from '../../common/audit/audit.service';

/** Storage key of one of the user's own avatar uploads inside a URL path, or null (path-style URLs prefix the bucket). */
export function ownAvatarKey(pathname: string, userId: string): string | null {
  const prefix = `avatars/${userId}/`;
  const at = pathname.indexOf(prefix);
  if (at !== 0 && !(at > 0 && pathname[at - 1] === '/')) return null;
  const key = pathname.slice(at);
  return key.length > prefix.length && !key.includes('..') ? key : null;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        provider: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            resumes: true,
            jobs: true,
            analyses: true,
            roadmaps: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            resumes: true,
            analyses: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdminStats() {
    const [totalUsers, totalResumes, activeJobs] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.resume.count(),
      this.prisma.job.count({ where: { isActive: true } }),
    ]);

    const latestUsers = await this.prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdAt: true },
    });

    const latestAnalyses = await this.prisma.analysis.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        job: { select: { title: true } },
      },
    });

    const activities = [
      ...latestUsers.map((u) => ({
        id: `user-${u.id}`,
        type: 'NEW_USER',
        title: 'New User Registered',
        description: `${u.name} joined the platform.`,
        date: u.createdAt,
      })),
      ...latestAnalyses.map((a) => ({
        id: `analysis-${a.id}`,
        type: 'NEW_ANALYSIS',
        title: 'Resume Analyzed',
        description: `${a.user.name} ran an analysis for ${a.job?.title || 'a job'}.`,
        date: a.createdAt,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);

    return {
      totalUsers,
      totalResumes,
      activeJobs,
      activities,
    };
  }

  async updateUserRole(adminId: string, targetUserId: string, role: Role) {
    if (adminId === targetUserId) {
      throw new BadRequestException('You cannot change your own role.');
    }
    
    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: { id: true, name: true, role: true }
    });
    await this.audit.log({
      userId: adminId,
      action: 'admin.role_change',
      entity: 'user',
      entityId: targetUserId,
      metadata: { role },
    });
    return updated;
  }

  async updateUserStatus(adminId: string, targetUserId: string, isActive: boolean) {
    if (adminId === targetUserId) {
      throw new BadRequestException('You cannot change your own account status.');
    }
    
    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
      select: { id: true, name: true, isActive: true }
    });
    if (!isActive) {
      // A disabled account must not keep working refresh tokens
      await this.prisma.userSession.deleteMany({ where: { userId: targetUserId } });
    }
    await this.audit.log({
      userId: adminId,
      action: 'admin.status_change',
      entity: 'user',
      entityId: targetUserId,
      metadata: { isActive },
    });
    return updated;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        avatar: dto.avatar,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        provider: true,
        isEmailVerified: true,
        updatedAt: true,
      },
    });
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('Only image files are allowed');
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('File size must be less than 5MB');

    const { url } = await this.storage.uploadFile(file, `avatars/${userId}`);

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: url },
    });

    return { avatar: url };
  }

  async getAvatarRedirectUrl(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatar: true } });
    if (!user || !user.avatar) {
      throw new NotFoundException('Avatar not found');
    }

    if (user.avatar.includes('amazonaws.com')) {
      try {
        const urlObj = new URL(user.avatar);
        // Only sign this user's own avatar objects. The avatar URL is user-editable, so signing whatever key it names
        // would hand out links to other files in the bucket (resumes of other users).
        const key = ownAvatarKey(decodeURIComponent(urlObj.pathname), userId);
        if (!key) return user.avatar;

        return await this.storage.getSignedUrl(key, 3600);
      } catch (e) {
        return user.avatar;
      }
    }

    return user.avatar;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.password) {
      throw new NotFoundException('User not found or OAuth account');
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newHash },
    });

    // Invalidate all sessions
    await this.prisma.userSession.deleteMany({ where: { userId } });

    return { message: 'Password changed successfully' };
  }

  async deleteAccount(userId: string) {
    // Stored files first: once the rows are gone their keys are lost
    const resumes = await this.prisma.resume.findMany({ where: { userId }, select: { fileKey: true } });
    const current = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatar: true } });
    const keys = resumes.map((r) => r.fileKey);
    if (current?.avatar?.includes('amazonaws.com')) {
      const avatarKey = ownAvatarKey(decodeURIComponent(new URL(current.avatar).pathname), userId);
      if (avatarKey) keys.push(avatarKey);
    }
    // StorageService.deleteFile logs and swallows its own errors, so a storage hiccup cannot block the deletion
    await Promise.all(keys.map((key) => this.storage.deleteFile(key)));

    // Remove everything the user created (analyses, embeddings, skill links and roadmap rows cascade); keep only the
    // anonymised user row and the audit trail
    await this.prisma.$transaction([
      this.prisma.coachingSession.deleteMany({ where: { userId } }),
      this.prisma.roadmap.deleteMany({ where: { userId } }),
      this.prisma.recommendation.deleteMany({ where: { userId } }),
      this.prisma.analysis.deleteMany({ where: { userId } }),
      this.prisma.resume.deleteMany({ where: { userId } }),
      this.prisma.job.deleteMany({ where: { userId } }),
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.authToken.deleteMany({ where: { userId } }),
      this.prisma.oAuthAccount.deleteMany({ where: { userId } }),
      this.prisma.userSession.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          deletedAt: new Date(),
          email: `deleted_${Date.now()}_${userId}@deleted.com`,
          name: 'Deleted user',
          avatar: null,
          password: null,
        },
      }),
    ]);
    await this.audit.log({ userId, action: 'user.delete_account', entity: 'user', entityId: userId });
    return { message: 'Account deleted successfully' };
  }

  async getStats(userId: string) {
    const [resumeCount, jobCount, analysisCount, roadmapCount, recommendations] =
      await Promise.all([
        this.prisma.resume.count({ where: { userId } }),
        this.prisma.job.count({ where: { userId } }),
        this.prisma.analysis.count({ where: { userId, status: 'COMPLETED' } }),
        this.prisma.roadmap.count({ where: { userId } }),
        this.prisma.recommendation.count({ where: { userId } }),
      ]);

    const latestAnalysis = await this.prisma.analysis.findFirst({
      where: { userId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: { matchScore: true, atsScore: true, createdAt: true },
    });

    return {
      resumeCount,
      jobCount,
      analysisCount,
      roadmapCount,
      recommendationCount: recommendations,
      latestAnalysis,
    };
  }
}
