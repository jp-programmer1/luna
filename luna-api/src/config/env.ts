import { z } from 'zod';

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? v.trim() : undefined));

const Env = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    MONGO_URI: z.string().startsWith('mongodb'),
    /** Origen del panel, único autorizado en /admin y /auth (CORS con credenciales). */
    PANEL_ORIGIN: z.string().url(),
    /** URL pública del portafolio, para revalidar el ISR de Vercel al publicar. */
    PUBLIC_SITE_URL: z.string().url(),

    /** Secreto para firmar los tokens de vista previa (mín. 32 caracteres). */
    PREVIEW_SECRET: z.string().min(32),
    /** Dominio de la cookie de sesión en producción: .lunakuyen.art. Vacío = solo el host de la API. */
    COOKIE_DOMAIN: optional,
    SESSION_DAYS: z.coerce.number().int().min(1).max(90).default(30),

    /** Sin RESEND_API_KEY el link mágico se imprime en la consola (solo fuera de producción). */
    RESEND_API_KEY: optional,
    MAIL_FROM: z.string().default('Panel de Luna <onboarding@resend.dev>'),

    /** bypassToken del ISR de Vercel. Sin él, publicar no revalida (útil en local). */
    REVALIDATE_TOKEN: optional,
    /** Base pública de los archivos subidos a R2 (fase 2). */
    MEDIA_BASE_URL: optional,
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.RESEND_API_KEY) {
      ctx.addIssue({ code: 'custom', path: ['RESEND_API_KEY'], message: 'obligatoria en producción' });
    }
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
