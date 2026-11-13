import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { Env } from '../config/env';
import { AuthService, PublicUser } from './auth.service';
import { CurrentUser, PanelOriginGuard, SESSION_COOKIE, SessionGuard } from './guards';

class MagicLinkDto extends createZodDto(z.object({ email: z.string().email().max(120) })) {}
class VerifyDto extends createZodDto(z.object({ token: z.string().min(20).max(200) })) {}

const FIFTEEN_MIN = 15 * 60 * 1000;

@ApiTags('auth')
@Controller('auth')
@UseGuards(PanelOriginGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private cookieOptions(expires?: Date): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'lax',
      domain: this.config.get('COOKIE_DOMAIN', { infer: true }),
      path: '/',
      ...(expires ? { expires } : {}),
    };
  }

  /** Siempre 204, exista o no el email. */
  @Post('magic-link')
  @HttpCode(204)
  @Throttle({ default: { limit: 5, ttl: FIFTEEN_MIN } })
  async magicLink(@Body() body: MagicLinkDto): Promise<void> {
    await this.auth.requestLink(body.email);
  }

  /** El panel abre /entrar?token=… y manda el token acá; la respuesta deja la cookie de sesión. */
  @Post('verify')
  @Throttle({ default: { limit: 10, ttl: FIFTEEN_MIN } })
  async verify(
    @Body() body: VerifyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: PublicUser }> {
    const { sessionToken, expiresAt, user } = await this.auth.verify(body.token, req.headers['user-agent']);
    res.cookie(SESSION_COOKIE, sessionToken, this.cookieOptions(expiresAt));
    return { user };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token === 'string' && token) await this.auth.logout(token);
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@CurrentUser() user: PublicUser): { user: PublicUser } {
    return { user };
  }
}
