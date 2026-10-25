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
import { AuthProvider, AuthTokenType, User } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { AuditService } from '../../common/audit/audit.service';

// Refresh and reset tokens are stored hashed so a DB leak can't be replayed
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

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
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const email = normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name,
        password: hashedPassword,
        provider: AuthProvider.LOCAL,
        isEmailVerified: false,
      },
    });

    this.logger.log(`New user registered: ${user.email}`);
    await this.audit.log({ userId: user.id, action: 'auth.register', entity: 'user', entityId: user.id });
    return this.generateTokens(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(email), isActive: true },
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
    await this.audit.log({ userId: user.id, action: 'auth.login', entity: 'user', entityId: user.id });

    return this.generateTokens(user);
  }

  async refreshToken(userId: string, refreshToken: string): Promise<AuthTokensDto> {
    const session = await this.prisma.userSession.findFirst({
      where: {
        userId,
        refreshTokenHash: sha256(refreshToken),
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
        where: { userId, refreshTokenHash: sha256(refreshToken) },
      });
    } else {
      // Logout from all devices
      await this.prisma.userSession.deleteMany({ where: { userId } });
    }
  }

  async forgotPassword(rawEmail: string): Promise<void> {
    const email = normalizeEmail(rawEmail);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      // Don't leak whether the email exists or not
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date();
    resetExpiry.setMinutes(resetExpiry.getMinutes() + 15);

    // Invalidate outstanding reset tokens, then store only the hash of the new one
    await this.prisma.authToken.deleteMany({
      where: { userId: user.id, type: AuthTokenType.PASSWORD_RESET, usedAt: null },
    });
    await this.prisma.authToken.create({
      data: {
        userId: user.id,
        type: AuthTokenType.PASSWORD_RESET,
        tokenHash: sha256(resetToken),
        expiresAt: resetExpiry,
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
    const authToken = await this.prisma.authToken.findFirst({
      where: {
        tokenHash: sha256(token),
        type: AuthTokenType.PASSWORD_RESET,
        usedAt: null,
        expiresAt: { gt: new Date() },
        user: { isActive: true },
      },
      include: { user: true },
    });

    if (!authToken) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: authToken.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: new Date() },
      }),
      // A password reset signs the user out everywhere
      this.prisma.userSession.deleteMany({ where: { userId: authToken.userId } }),
    ]);

    await this.audit.log({
      userId: authToken.userId,
      action: 'auth.password_reset',
      entity: 'user',
      entityId: authToken.userId,
    });
    this.logger.log(`Password reset successful for user: ${authToken.user.email}`);
  }

  async googleLogin(profile: any): Promise<AuthTokensDto> {
    const { id, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value ? normalizeEmail(emails[0].value) : undefined;
    if (!email) {
      throw new BadRequestException('Google account must have an email address');
    }

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
    const email = emails?.[0]?.value ? normalizeEmail(emails[0].value) : undefined;

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

    // 1. Known social account -> its user
    const linked = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider, providerId } },
      include: { user: true },
    });
    let user: User | null = linked?.user ?? null;

    // 2. Otherwise match by email and link this provider to the existing account
    if (!user) {
      user = await this.prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          avatar,
          provider,
          isEmailVerified: true,
          oauthAccounts: { create: { provider, providerId } },
        },
      });
    } else if (!linked) {
      await this.prisma.oAuthAccount.create({ data: { userId: user.id, provider, providerId } });
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true, avatar: user.avatar || avatar },
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    await this.audit.log({
      userId: user.id,
      action: `auth.login.${provider.toLowerCase()}`,
      entity: 'user',
      entityId: user.id,
    });

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
        // Unique id: two sessions minted in the same second must not collide on the unique token hash
        jwtid: crypto.randomUUID(),
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
        refreshTokenHash: sha256(refreshToken),
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
