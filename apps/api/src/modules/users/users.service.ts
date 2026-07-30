import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcryptjs';

import { StorageService } from '../../common/storage/storage.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
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
    
    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: { id: true, name: true, role: true }
    });
  }

  async updateUserStatus(adminId: string, targetUserId: string, isActive: boolean) {
    if (adminId === targetUserId) {
      throw new BadRequestException('You cannot change your own account status.');
    }
    
    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
      select: { id: true, name: true, isActive: true }
    });
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
        const key = urlObj.pathname.substring(1); 
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
      throw new ConflictException('Current password is incorrect');
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
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false, email: `deleted_${Date.now()}_${userId}@deleted.com` },
    });
    await this.prisma.userSession.deleteMany({ where: { userId } });
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
