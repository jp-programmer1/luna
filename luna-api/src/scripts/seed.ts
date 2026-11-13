import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { Revision } from '../database/schemas/revision.schema';
import { Site, SITE_ID } from '../database/schemas/site.schema';
import { User } from '../database/schemas/user.schema';
import { currentPortfolioContent } from './seed-content';

/**
 * Carga el contenido actual del portafolio como borrador y lo publica como
 * primera versión. Uso: pnpm --filter luna-api seed [--force]
 * Necesita al menos un usuario (pnpm --filter luna-api user:add …).
 */
async function main() {
  const force = process.argv.includes('--force');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const sites = app.get<Model<Site>>(getModelToken(Site.name));
    const revisions = app.get<Model<Revision>>(getModelToken(Revision.name));
    const users = app.get<Model<User>>(getModelToken(User.name));

    if ((await sites.exists({ _id: SITE_ID })) && !force) {
      console.log('El sitio ya existe. Usá --force para reemplazar el borrador y publicar de nuevo.');
      return;
    }
    const author = (await users.findOne({ role: 'admin' })) ?? (await users.findOne());
    if (!author) {
      console.error('No hay usuarios. Creá uno primero: pnpm --filter luna-api user:add <email> "<nombre>" admin');
      process.exitCode = 1;
      return;
    }

    const draft = currentPortfolioContent();
    const revision = await revisions.create({ snapshot: draft, note: 'Contenido inicial', createdBy: author._id });
    await sites.findOneAndUpdate(
      { _id: SITE_ID },
      { $set: { draft, draftUpdatedAt: new Date(), publishedRevisionId: revision._id }, $inc: { version: 1 } },
      { upsert: true },
    );
    console.log(`Listo: ${draft.sections.length} secciones cargadas y publicadas.`);
  } finally {
    await app.close();
  }
}

void main();
