import type { RichText, Section, Site } from '@luna/shared';
import fallback from '../data/site.fallback.json';

export type MediaRef = {
  kind: 'image' | 'video';
  url: string | null;
  alt: string;
  width: number | null;
  height: number | null;
  focal: { x: number; y: number };
};

/** Lo que devuelve la API en /public/site y /public/preview/:token. */
export type PublicSite = Site & {
  media: Record<string, MediaRef>;
  updatedAt: string;
  /** Solo si se usó el respaldo: por qué no se pudo leer la API. */
  fallbackReason?: string;
};

export type { RichText, Section };

const TIMEOUT_MS = 4000;

/** En Vercel viene de process.env en tiempo de ejecución; en local, del .env de Astro. */
function apiUrl(): string | undefined {
  const value = process.env.LUNA_API_URL ?? import.meta.env.LUNA_API_URL;
  return value ? String(value).replace(/\/$/, '') : undefined;
}

async function fetchSite(path: string): Promise<Response | null> {
  const base = apiUrl();
  if (!base) return null;
  return fetch(`${base}${path}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

/**
 * Versión publicada. Si la API no responde o todavía no hay nada publicado,
 * usa el contenido de respaldo del repo: el sitio nunca queda en blanco.
 */
export async function getPublishedSite(): Promise<PublicSite> {
  let reason: string;
  try {
    const res = await fetchSite('/public/site');
    if (res?.ok) return (await res.json()) as PublicSite;
    reason = res
      ? res.status === 404
        ? `La API (${apiUrl()}) respondió que todavía no hay nada publicado: corré el seed o publicá desde el panel.`
        : `La API (${apiUrl()}) respondió ${res.status}.`
      : 'Falta LUNA_API_URL en luna-portafolio/.env (o reiniciá el dev server después de agregarla).';
  } catch (err) {
    reason = `No pude conectar con la API en ${apiUrl()}: ${(err as Error).cause ?? (err as Error).message}. ¿Está corriendo pnpm dev:api?`;
  }
  console.error(`[site] Uso el contenido de respaldo. ${reason}`);
  return { ...(fallback as PublicSite), fallbackReason: reason };
}

/** Borrador para el iframe del panel; si no se puede, el motivo. */
export async function getPreviewSite(token: string): Promise<{ site: PublicSite } | { error: string }> {
  if (!/^\d+\.[\w-]+$/.test(token)) return { error: 'El link de vista previa no es válido.' };
  try {
    const res = await fetchSite(`/public/preview/${encodeURIComponent(token)}`);
    if (!res) return { error: 'Falta LUNA_API_URL en luna-portafolio/.env (o reiniciá el dev server después de agregarla).' };
    if (res.ok) return { site: (await res.json()) as PublicSite };
    if (res.status === 404) return { error: 'La vista previa venció. Abrila de nuevo desde el panel.' };
    return { error: `La API respondió ${res.status}.` };
  } catch (err) {
    return { error: `No pude conectar con la API en ${apiUrl()}: ${(err as Error).cause ?? (err as Error).message}` };
  }
}

/** URL de una foto de la biblioteca, o el respaldo si la sección no tiene una. */
export function mediaUrl(site: PublicSite, id: string | null | undefined, fallbackUrl: string): string {
  const url = id ? site.media[id]?.url : null;
  if (!url) return fallbackUrl;
  return url.startsWith('/') ? `${apiUrl() ?? ''}${url}` : url;
}

/** Punto de foco como object-position, para que el recorte no corte la cara. */
export function mediaPosition(site: PublicSite, id: string | null | undefined): string | undefined {
  const m = id ? site.media[id] : undefined;
  return m ? `${Math.round(m.focal.x * 100)}% ${Math.round(m.focal.y * 100)}%` : undefined;
}

/** Variante de fondo de una sección. */
export const variantClass = (variant: Section['variant']): string => (variant === 'card' ? 'bg-card/40' : '');
