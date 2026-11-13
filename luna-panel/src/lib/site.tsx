import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { api, ApiError, type SiteState } from './api';


type SiteCtx = {
  state: SiteState | undefined;
  isLoading: boolean;
  error: unknown;
  /** Guardados en curso: para mostrar "Guardando…" / "Guardado". */
  saving: boolean;
  lastSavedAt: number | null;
  /**
   * Ejecuta un cambio sobre el borrador. Los cambios se encolan: cada uno sale
   * con la versión que dejó el anterior, así nunca se pisan entre sí.
   */
  run: <T extends SiteState>(op: (version: number) => Promise<T>) => Promise<T>;
};

const Ctx = createContext<SiteCtx | null>(null);
export const SITE_KEY = ['site'] as const;

export function SiteProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: SITE_KEY, queryFn: api.site });
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const [pending, setPending] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const run = useCallback(
    <T extends SiteState>(op: (version: number) => Promise<T>): Promise<T> => {
      setPending((n) => n + 1);
      const p = chain.current.then(async () => {
        const current: SiteState = qc.getQueryData<SiteState>(SITE_KEY) ?? (await qc.fetchQuery({ queryKey: SITE_KEY, queryFn: api.site }));
        try {
          const next = await op(current.version);
          qc.setQueryData(SITE_KEY, next);
          setLastSavedAt(Date.now());
          return next;
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            await qc.refetchQueries({ queryKey: SITE_KEY });
            toast.error('Se guardaron cambios desde otra pestaña. Cargué la última versión.');
          } else if (err instanceof ApiError && err.status === 401) {
            window.location.assign('/entrar');
          } else if (err instanceof ApiError && err.body.errors?.length) {
            toast.error(`No se pudo guardar: ${err.body.errors[0].message}`);
          } else {
            toast.error(err instanceof Error ? err.message : 'No se pudo guardar.');
          }
          throw err;
        } finally {
          setPending((n) => n - 1);
        }
      });
      chain.current = p.catch(() => undefined);
      return p;
    },
    [qc],
  );

  // Avisar si se cierra la pestaña con un guardado en curso.
  useEffect(() => {
    if (!pending) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [pending]);

  const value = useMemo(
    () => ({ state: query.data, isLoading: query.isLoading, error: query.error, saving: pending > 0, lastSavedAt, run }),
    [query.data, query.isLoading, query.error, pending, lastSavedAt, run],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSite() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSite fuera de SiteProvider');
  return ctx;
}

/**
 * Autoguardado de una sección: junta los cambios y los manda 700 ms después
 * de la última tecla. Al salir del editor manda lo que haya quedado.
 */
export function useSectionAutosave(sectionId: string) {
  const { run } = useSite();
  const pending = useRef<Record<string, unknown>>({});
  const timer = useRef<number | undefined>(undefined);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length) run((v) => api.updateSection(v, sectionId, patch)).catch(() => undefined);
  }, [run, sectionId]);

  const save = useCallback(
    (patch: Record<string, unknown>, { immediate = false } = {}) => {
      pending.current = { ...pending.current, ...patch };
      window.clearTimeout(timer.current);
      if (immediate) flush();
      else timer.current = window.setTimeout(flush, 700);
    },
    [flush],
  );

  useEffect(() => () => flush(), [flush]);
  return { save, flush };
}
