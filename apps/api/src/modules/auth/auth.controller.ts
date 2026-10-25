import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { LinkedInAuthGuard } from './guards/linkedin-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { tokenLifetimeMs } from './token-lifetime';

/** Brute-force guard for credential endpoints: per-IP, default 10 requests/minute. */
const AUTH_THROTTLE = { default: { limit: Number(process.env.AUTH_THROTTLE_LIMIT ?? 10), ttl: 60_000 } };

/** Same attributes when setting and clearing, so the browser reliably removes the cookie on logout. */
function authCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
  };
}

function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }, isProduction: boolean) {
  const cookieOptions = authCookieOptions(isProduction);

  // Each cookie lasts exactly as long as the token inside it
  res.cookie('accessToken', tokens.accessToken, {
    ...cookieOptions,
    maxAge: tokenLifetimeMs(tokens.accessToken) ?? 60 * 60 * 1000,
  });

  res.cookie('refreshToken', tokens.refreshToken, {
    ...cookieOptions,
    maxAge: tokenLifetimeMs(tokens.refreshToken) ?? 30 * 24 * 60 * 60 * 1000,
  });
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    const isProd = this.config.get('NODE_ENV') === 'production';
    setAuthCookies(res, { accessToken: result.accessToken, refreshToken: result.refreshToken }, isProd);
    return { user: result.user };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@CurrentUser() user: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(user);
    const isProd = this.config.get('NODE_ENV') === 'production';
    setAuthCookies(res, { accessToken: result.accessToken, refreshToken: result.refreshToken }, isProd);
    return { user: result.user };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(@CurrentUser() user: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokenToRefresh = req.cookies?.refreshToken || req.body?.refreshToken;
    const result = await this.authService.refreshToken(user.id, tokenToRefresh);
    const isProd = this.config.get('NODE_ENV') === 'production';
    setAuthCookies(res, { accessToken: result.accessToken, refreshToken: result.refreshToken }, isProd);
    return { user: result.user };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Logout and invalidate tokens' })
  async logout(@CurrentUser('id') userId: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    await this.authService.logout(userId, refreshToken);
    const options = authCookieOptions(this.config.get('NODE_ENV') === 'production');
    res.clearCookie('accessToken', options);
    res.clearCookie('refreshToken', options);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('user')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get current authenticated user' })
  async getMe(@CurrentUser() user: any) {
    return user;
  }

  @Public()
  @Throttle({ default: { limit: Number(process.env.AUTH_THROTTLE_LIMIT ?? 5), ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If an account exists with this email, a password reset link has been sent.' };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { message: 'Password has been successfully reset' };
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleAuth() {
    // Passport handles the redirect
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@CurrentUser() user: any, @Res() res: Response) {
    const tokens = await this.authService.googleLogin(user);
    const frontendUrl = this.config.get('app.frontendUrl', 'http://localhost:3000');
    const isProd = this.config.get('NODE_ENV') === 'production';
    setAuthCookies(res, tokens, isProd);
    res.redirect(`${frontendUrl}/dashboard`);
  }

  // ── LinkedIn OAuth ────────────────────────────────────────────────────────
  @Public()
  @Get('linkedin')
  @UseGuards(LinkedInAuthGuard)
  @ApiOperation({ summary: 'Initiate LinkedIn OAuth login' })
  async linkedInAuth() {
    // Passport handles the redirect
  }

  @Public()
  @Get('linkedin/callback')
  @UseGuards(LinkedInAuthGuard)
  async linkedInCallback(@CurrentUser() user: any, @Res() res: Response) {
    const tokens = await this.authService.linkedInLogin(user);
    const frontendUrl = this.config.get('app.frontendUrl', 'http://localhost:3000');
    const isProd = this.config.get('NODE_ENV') === 'production';
    setAuthCookies(res, tokens, isProd);
    res.redirect(`${frontendUrl}/dashboard`);
  }
}
