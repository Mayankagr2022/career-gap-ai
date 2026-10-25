import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-linkedin-oauth2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor(private readonly config: ConfigService) {
    super({
      // The strategy constructor throws on an empty client ID, which would stop the whole API from starting;
      // with a placeholder the app boots and only this provider's login fails until it is configured.
      clientID: config.get('oauth.linkedin.clientId') || 'not-configured',
      clientSecret: config.get('oauth.linkedin.clientSecret') || 'not-configured',
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
