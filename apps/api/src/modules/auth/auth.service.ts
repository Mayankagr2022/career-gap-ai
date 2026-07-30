import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AuthProvider, User } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    private readonly mailerService: MailerService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        provider: AuthProvider.LOCAL,
        isEmailVerified: false,
      },
    });

    this.logger.log(`New user registered: ${user.email}`);
    return this.generateTokens(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email, isActive: true },
    });

    if (!user || !user.password) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(user: User): Promise<AuthTokensDto> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user);
  }

  async refreshToken(userId: string, refreshToken: string): Promise<AuthTokensDto> {
    const session = await this.prisma.userSession.findFirst({
      where: {
        userId,
        refreshToken,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session || !session.user.isActive) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate refresh token
    await this.prisma.userSession.delete({ where: { id: session.id } });

    return this.generateTokens(session.user);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.userSession.deleteMany({
        where: { userId, refreshToken },
      });
    } else {
      // Logout from all devices
      await this.prisma.userSession.deleteMany({ where: { userId } });
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      // Don't leak whether the email exists or not
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date();
    resetExpiry.setMinutes(resetExpiry.getMinutes() + 15);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry,
      },
    });

    const frontendUrl = this.config.get('app.frontendUrl', 'http://localhost:3000');
    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Reset your password - Career Gap AI',
        text: `Click the following link to reset your password: ${resetLink}`,
        html: `<p>Click the following link to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link is valid for 15 minutes.</p>`,
      });
      this.logger.log(`Password reset email sent to: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
        isActive: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    this.logger.log(`Password reset successful for user: ${user.email}`);
  }

  async googleLogin(profile: any): Promise<AuthTokensDto> {
    const { id, emails, displayName, photos } = profile;
    const email = emails[0].value;

    return this.handleOAuthLogin({
      email,
      name: displayName,
      avatar: photos?.[0]?.value,
      provider: AuthProvider.GOOGLE,
      providerId: id,
    });
  }

  async linkedInLogin(profile: any): Promise<AuthTokensDto> {
    const { id, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      throw new BadRequestException('LinkedIn account must have an email address');
    }

    return this.handleOAuthLogin({
      email,
      name: displayName,
      avatar: photos?.[0]?.value,
      provider: AuthProvider.LINKEDIN,
      providerId: id,
    });
  }

  private async handleOAuthLogin(params: {
    email: string;
    name: string;
    avatar?: string;
    provider: AuthProvider;
    providerId: string;
  }): Promise<AuthTokensDto> {
    const { email, name, avatar, provider, providerId } = params;

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { provider, providerId }],
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          avatar,
          provider,
          providerId,
          isEmailVerified: true,
        },
      });
    } else if (user.provider !== provider) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          provider,
          providerId,
          isEmailVerified: true,
          avatar: user.avatar || avatar,
        },
      });
    }

    return this.generateTokens(user);
  }

  private async generateTokens(user: User): Promise<AuthTokensDto> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('jwt.secret'),
        expiresIn: this.config.get('jwt.expiresIn', '7d'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpiresIn', '30d'),
      }),
    ]);

    // Prune expired sessions for this user to prevent table bloat
    await this.prisma.userSession.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        provider: user.provider,
      },
    };
  }
}
