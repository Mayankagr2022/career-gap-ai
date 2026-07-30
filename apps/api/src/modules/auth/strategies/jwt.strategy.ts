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

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, isActive: true },
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
    });

    if (!user) {
      throw new UnauthorizedException('User not found or account deactivated');
    }

    return user;
  }
}
