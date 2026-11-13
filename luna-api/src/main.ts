import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
import type { Env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);

  // El panel manda la cookie de sesión: solo su origen, con credenciales.
  // /public lo lee el portafolio desde el servidor de Vercel, no necesita CORS.
  app.enableCors({
    origin: config.get('PANEL_ORIGIN', { infer: true }),
    credentials: true,
  });
  app.enableShutdownHooks();

  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Luna API').setVersion('0.1.0').build(),
    );
    SwaggerModule.setup('docs', app, cleanupOpenApiDoc(doc));
  }

  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
