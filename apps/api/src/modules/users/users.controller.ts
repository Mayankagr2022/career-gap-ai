import { Controller, Get, Put, Body, Delete, UseGuards, HttpCode, HttpStatus, Post, UseInterceptors, UploadedFile, Param, Redirect, Res, BadRequestException, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly adminAnalytics: AdminAnalyticsService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  getAllUsers() {
    return this.usersService.findAll();
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get global admin stats' })
  getAdminStats() {
    return this.usersService.getAdminStats();
  }

  @Get('admin/analytics')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Time series, distributions and AI usage for the admin dashboard (Admin only)' })
  getAdminAnalytics(@Query('days') days?: string) {
    return this.adminAnalytics.getAnalytics(Number(days ?? 30));
  }

  @Get('admin/audit')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Paged audit log (Admin only)' })
  getAuditLog(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('action') action?: string,
  ) {
    return this.adminAnalytics.getAuditLog({
      limit: Number(limit ?? 50),
      skip: Number(skip ?? 0),
      action: action?.slice(0, 40) || undefined,
    });
  }

  @Put('admin/:id/role')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a users role' })
  updateUserRole(
    @CurrentUser('id') adminId: string, 
    @Param('id') targetId: string, 
    @Body('role') role: Role
  ) {
    if (!Object.values(Role).includes(role)) {
      throw new BadRequestException('Invalid role provided');
    }
    return this.usersService.updateUserRole(adminId, targetId, role);
  }

  @Put('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a users active status' })
  updateUserStatus(
    @CurrentUser('id') adminId: string, 
    @Param('id') targetId: string, 
    @Body('isActive') isActive: boolean
  ) {
    if (typeof isActive !== 'boolean') {
      throw new BadRequestException('isActive must be a boolean');
    }
    return this.usersService.updateUserStatus(adminId, targetId, isActive);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  getStats(@CurrentUser('id') userId: string) {
    return this.usersService.getStats(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Upload profile avatar' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  uploadAvatar(@CurrentUser('id') userId: string, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.uploadAvatar(userId, file);
  }

  @Public()
  @Get(':id/avatar')
  @ApiOperation({ summary: 'Get user avatar proxy url' })
  async getAvatar(@Param('id') id: string, @Res() res: any) {
    try {
      const url = await this.usersService.getAvatarRedirectUrl(id);
      return res.redirect(url);
    } catch (e) {
      return res.status(404).send('Avatar not found');
    }
  }

  @Put('change-password')
  @ApiOperation({ summary: 'Change user password' })
  changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(userId, dto);
  }

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user account' })
  deleteAccount(@CurrentUser('id') userId: string) {
    return this.usersService.deleteAccount(userId);
  }
}
