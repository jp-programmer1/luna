import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { Env } from './config/env';

/** Configuración HTTP compartida por main.ts y los tests e2e. */
export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService<Env, true>);

  // Detrás del reverse proxy del VPS: IP real para el rate limit y cookies Secure.
  (app as NestExpressApplication).set('trust proxy', 1);
  app.use(cookieParser());

  // El panel manda la cookie de sesión: solo su origen, con credenciales.
  // /public lo lee el portafolio desde el servidor de Vercel, no necesita CORS.
  app.enableCors({
    origin: config.get('PANEL_ORIGIN', { infer: true }),
    credentials: true,
  });
  return app;
}
