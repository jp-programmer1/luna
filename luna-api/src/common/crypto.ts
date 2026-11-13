import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** Token opaco para links y sesiones (256 bits, base64url). */
export const randomToken = (): string => randomBytes(32).toString('base64url');

/** En la base solo se guarda el hash: un dump no sirve para entrar. */
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/** Token firmado `<expiraEnMs>.<firma>` para la vista previa del borrador. */
export function signPreviewToken(secret: string, ttlMs: number, now = Date.now()) {
  const expiresAt = now + ttlMs;
  const sig = createHmac('sha256', secret).update(`preview.${expiresAt}`).digest('base64url');
  return { token: `${expiresAt}.${sig}`, expiresAt: new Date(expiresAt) };
}

export function verifyPreviewToken(secret: string, token: string, now = Date.now()): boolean {
  const [exp, sig] = token.split('.');
  const expiresAt = Number(exp);
  if (!sig || !Number.isFinite(expiresAt) || expiresAt < now) return false;
  const expected = createHmac('sha256', secret).update(`preview.${expiresAt}`).digest();
  const given = Buffer.from(sig, 'base64url');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
