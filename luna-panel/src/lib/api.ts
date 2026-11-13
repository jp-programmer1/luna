import type { SectionType, Settings, Site, SiteChange } from '@luna/shared';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:3000';
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:4321';

export type User = { id: string; email: string; name: string; role: 'owner' | 'admin' };

/** Lo que responde la API en cada lectura o escritura del borrador. */
export type SiteState = {
  draft: Site;
  version: number;
  draftUpdatedAt: string;
  publishedAt: string | null;
  changes: SiteChange[];
};

export type RevisionRow = {
  id: string;
  note: string;
  createdAt: string;
  createdBy: string | null;
  live: boolean;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: { currentVersion?: number; errors?: { path: string; message: string }[] } = {},
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit & { version?: number } = {}): Promise<T> {
  const { version, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      ...rest,
      headers: {
        ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
        ...(version !== undefined ? { 'If-Match': String(version) } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. Revisá internet y probá de nuevo.');
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new ApiError(res.status, message || 'Algo salió mal. Probá de nuevo.', body);
  }
  return body as T;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  /* auth */
  me: () => request<{ user: User }>('/auth/me').then((r) => r.user),
  requestLink: (email: string) => request<void>('/auth/magic-link', { method: 'POST', body: json({ email }) }),
  verify: (token: string) => request<{ user: User }>('/auth/verify', { method: 'POST', body: json({ token }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),

  /* borrador */
  site: () => request<SiteState>('/admin/site'),
  updateSettings: (version: number, patch: Partial<Settings>) =>
    request<SiteState>('/admin/settings', { method: 'PATCH', version, body: json(patch) }),
  addSection: (version: number, type: SectionType, after?: string | null) =>
    request<SiteState>('/admin/sections', { method: 'POST', version, body: json({ type, after }) }),
  updateSection: (version: number, id: string, patch: Record<string, unknown>) =>
    request<SiteState>(`/admin/sections/${id}`, { method: 'PATCH', version, body: json(patch) }),
  duplicateSection: (version: number, id: string) =>
    request<SiteState>(`/admin/sections/${id}/duplicate`, { method: 'POST', version }),
  removeSection: (version: number, id: string) =>
    request<SiteState>(`/admin/sections/${id}`, { method: 'DELETE', version }),
  reorder: (version: number, ids: string[]) =>
    request<SiteState>('/admin/sections/order', { method: 'PUT', version, body: json({ ids }) }),

  /* publicación */
  publish: (version: number, note?: string) =>
    request<SiteState & { revalidated: boolean }>('/admin/publish', { method: 'POST', version, body: json({ note }) }),
  discard: (version: number) => request<SiteState>('/admin/discard', { method: 'POST', version }),
  revisions: () => request<RevisionRow[]>('/admin/revisions'),
  restore: (version: number, id: string) =>
    request<SiteState>(`/admin/revisions/${id}/restore`, { method: 'POST', version }),
  previewToken: () => request<{ token: string; expiresAt: string }>('/admin/preview-token', { method: 'POST' }),
};
