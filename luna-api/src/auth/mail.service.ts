import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { Env } from '../config/env';

/** Manda el link mágico. Sin RESEND_API_KEY (local) lo imprime en la consola. */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(config: ConfigService<Env, true>) {
    const key = config.get('RESEND_API_KEY', { infer: true });
    this.resend = key ? new Resend(key) : null;
    this.from = config.get('MAIL_FROM', { infer: true });
  }

  async sendMagicLink(to: { email: string; name: string }, link: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`Link de acceso para ${to.email}: ${link}`);
      return;
    }
    const firstName = to.name.split(' ')[0];
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: to.email,
      subject: 'Tu link para entrar al panel',
      text: [
        `Hola, ${firstName}:`,
        '',
        'Tocá este link para entrar al panel de tu sitio. Vence en 15 minutos y sirve una sola vez.',
        '',
        link,
        '',
        'Si no lo pediste, ignorá este mail.',
      ].join('\n'),
    });
    if (error) {
      this.logger.error(`Resend no pudo mandar el link a ${to.email}: ${error.message}`);
    } else {
      this.logger.log(`Link de acceso enviado por mail a ${to.email} (Resend).`);
    }
  }
}
