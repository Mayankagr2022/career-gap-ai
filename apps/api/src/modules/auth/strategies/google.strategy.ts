import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly config: ConfigService) {
    super({
      // The strategy constructor throws on an empty client ID, which would stop the whole API from starting;
      // with a placeholder the app boots and only this provider's login fails until it is configured.
      clientID: config.get('oauth.google.clientId') || 'not-configured',
      clientSecret: config.get('oauth.google.clientSecret') || 'not-configured',
      callbackURL: config.get('oauth.google.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    done(null, profile);
  }
}
