import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGO_URI: z.string().startsWith('mongodb'),
  /** Origen del panel, único autorizado en /admin y /auth (CORS con credenciales). */
  PANEL_ORIGIN: z.string().url(),
  /** URL pública del portafolio, para revalidar el ISR de Vercel al publicar. */
  PUBLIC_SITE_URL: z.string().url(),
});

export type Env = z.infer<typeof Env>;

/** Usado por ConfigModule: corta el arranque si falta o sobra algo mal escrito. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = Env.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Variables de entorno inválidas:\n${detail}`);
  }
  return parsed.data;
}
