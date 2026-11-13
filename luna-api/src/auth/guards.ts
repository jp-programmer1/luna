import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../config/env';
import { AuthService, PublicUser } from './auth.service';

export const SESSION_COOKIE = 'luna_session';

type AuthedRequest = Request & { user?: PublicUser };

/** Exige una sesión válida en la cookie y deja el usuario en req.user. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || !token) throw new UnauthorizedException('Tenés que entrar de nuevo.');
    const user = await this.auth.userForSession(token);
    if (!user) throw new UnauthorizedException('Tu sesión venció. Entrá de nuevo.');
    req.user = user;
    return true;
  }
}

/**
 * Defensa contra CSRF además de SameSite=Lax: todo lo que no sea GET en /auth
 * y /admin tiene que venir del panel (header Origin igual a PANEL_ORIGIN).
 */
@Injectable()
export class PanelOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return true;
    if (req.headers.origin !== this.config.get('PANEL_ORIGIN', { infer: true })) {
      throw new ForbiddenException('Origen no permitido.');
    }
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): PublicUser => ctx.switchToHttp().getRequest<AuthedRequest>().user!,
);
