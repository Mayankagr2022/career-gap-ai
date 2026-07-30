import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: (req: any) => {
        let token = null;
        if (req && req.cookies) {
          token = req.cookies['refreshToken'];
        }
        if (!token && req.body) {
          token = req.body.refreshToken;
        }
        return token;
      },
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: { sub: string; email: string; role: string }) {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    return { ...payload, id: payload.sub, refreshToken };
  }
}
