import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { z } from 'zod';
import { AppModule } from '../app.module';
import { User } from '../database/schemas/user.schema';

/**
 * Alta (o actualización) de quien puede entrar al panel.
 * Uso: pnpm --filter luna-api user:add <email> "<nombre>" [owner|admin]
 */
const Args = z.tuple([z.string().email(), z.string().min(1), z.enum(['owner', 'admin']).default('owner')]);

async function main() {
  const parsed = Args.safeParse(process.argv.slice(2, 5));
  if (!parsed.success) {
    console.error('Uso: pnpm --filter luna-api user:add <email> "<nombre>" [owner|admin]');
    process.exitCode = 1;
    return;
  }
  const [email, name, role] = parsed.data;
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const users = app.get<Model<User>>(getModelToken(User.name));
    const user = await users.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: { name, role } },
      { upsert: true, new: true },
    );
    console.log(`Listo: ${user.email} (${user.role}) puede pedir su link de acceso.`);
  } finally {
    await app.close();
  }
}

void main();
