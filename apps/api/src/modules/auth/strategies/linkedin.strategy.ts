import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-linkedin-oauth2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor(private readonly config: ConfigService) {
    super({
      clientID: config.get('oauth.linkedin.clientId'),
      clientSecret: config.get('oauth.linkedin.clientSecret'),
      callbackURL: config.get('oauth.linkedin.callbackUrl'),
      scope: ['openid', 'profile', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ) {
    done(null, profile);
  }
}
