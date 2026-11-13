import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomToken, sha256 } from '../common/crypto';
import type { Env } from '../config/env';
import { LoginToken, Session } from '../database/schemas/auth.schema';
import { User, UserDocument } from '../database/schemas/user.schema';
import { MailService } from './mail.service';

const LINK_TTL_MS = 15 * 60 * 1000;

export type PublicUser = { id: string; email: string; name: string; role: 'owner' | 'admin' };

export const toPublicUser = (u: UserDocument): PublicUser => ({
  id: u._id.toString(),
  email: u.email,
  name: u.name,
  role: u.role,
});

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(LoginToken.name) private readonly loginTokens: Model<LoginToken>,
    @InjectModel(Session.name) private readonly sessions: Model<Session>,
    private readonly mail: MailService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Siempre termina igual, exista o no el email: así no se puede averiguar
   * quién tiene cuenta probando direcciones.
   */
  async requestLink(email: string): Promise<void> {
    const normalized = email.toLowerCase().trim();
    const user = await this.users.findOne({ email: normalized });
    if (!user) {
      // Al panel se le responde igual; acá sí se avisa, para poder diagnosticar.
      const total = await this.users.countDocuments();
      this.logger.warn(
        total === 0
          ? `Pidieron link para ${normalized}, pero no hay ningún usuario en esta base. Corré user:add.`
          : `Pidieron link para ${normalized}, pero ese mail no está cargado (hay ${total} usuario/s).`,
      );
      return;
    }
    const token = randomToken();
    await this.loginTokens.create({
      tokenHash: sha256(token),
      userId: user._id,
      expiresAt: new Date(Date.now() + LINK_TTL_MS),
    });
    const link = new URL('/entrar', this.config.get('PANEL_ORIGIN', { infer: true }));
    link.searchParams.set('token', token);
    await this.mail.sendMagicLink(user, link.toString());
  }

  /** Canjea el link (una sola vez) por una sesión. */
  async verify(token: string, userAgent = '') {
    const login = await this.loginTokens.findOneAndDelete({
      tokenHash: sha256(token),
      expiresAt: { $gt: new Date() },
    });
    if (!login) throw new UnauthorizedException('El link venció o ya se usó. Pedí uno nuevo.');
    const user = await this.users.findById(login.userId);
    if (!user) throw new UnauthorizedException('El usuario ya no existe.');

    const sessionToken = randomToken();
    const days = this.config.get('SESSION_DAYS', { infer: true });
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.sessions.create({
      tokenHash: sha256(sessionToken),
      userId: user._id,
      expiresAt,
      userAgent: userAgent.slice(0, 300),
    });
    return { sessionToken, expiresAt, user: toPublicUser(user) };
  }

  async userForSession(sessionToken: string): Promise<PublicUser | null> {
    const session = await this.sessions.findOne({
      tokenHash: sha256(sessionToken),
      expiresAt: { $gt: new Date() },
    });
    if (!session) return null;
    const user = await this.users.findById(session.userId);
    return user ? toPublicUser(user) : null;
  }

  async logout(sessionToken: string): Promise<void> {
    await this.sessions.deleteOne({ tokenHash: sha256(sessionToken) });
  }
}
