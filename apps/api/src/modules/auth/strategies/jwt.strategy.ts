import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: (req: any) => {
        let token = null;
        if (req && req.cookies) {
          token = req.cookies['accessToken'];
        }
        if (!token) {
          token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
        }
        return token;
      },
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.secret'),
    });
  }

  /**
   * An access token is valid only while the session it was issued for exists. Logout, a password change, an admin
   * deactivating the account and refresh-token rotation all delete the session, which ends the token at once.
   * This replaces the plain user lookup, so it costs no extra query.
   */
  async validate(payload: { sub: string; sid?: string }) {
    if (!payload.sid) {
      // Issued before sessions were bound to tokens: ask the browser to refresh, which issues a bound token
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    const session = await this.prisma.userSession.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        expiresAt: { gt: new Date() },
        user: { isActive: true },
      },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            role: true,
            provider: true,
            isEmailVerified: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Session ended or account deactivated');
    }

    return session.user;
  }
}
