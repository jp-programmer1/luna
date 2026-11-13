import { useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, House, LoaderCircle, LogOut, PanelsTopLeft, SlidersHorizontal } from 'lucide-react';
import { createContext, useContext, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { api, SITE_URL, type User } from '../lib/api';
import { useSite } from '../lib/site';
import { PublishDialog } from './PublishDialog';
import { cx } from './ui';

const nav = [
  { to: '/', label: 'Inicio', icon: House, end: true },
  { to: '/pagina', label: 'Mi página', icon: PanelsTopLeft, end: false },
  { to: '/ajustes', label: 'Ajustes', icon: SlidersHorizontal, end: false },
];

const PublishCtx = createContext<() => void>(() => undefined);
/** Abre el diálogo de publicar desde cualquier pantalla. */
export const useOpenPublish = () => useContext(PublishCtx);

export function Layout({ user }: { user: User }) {
  const [publishOpen, setPublishOpen] = useState(false);
  const qc = useQueryClient();

  const logout = async () => {
    await api.logout().catch(() => undefined);
    qc.clear();
    window.location.assign('/entrar');
  };

  return (
    <PublishCtx.Provider value={() => setPublishOpen(true)}>
      <div className="flex min-h-full">
        {/* Menú lateral (compu) */}
        <nav aria-label="Menú del panel" className="hidden w-[248px] shrink-0 flex-col gap-1 border-r border-line-soft bg-sidebar px-4 py-7 md:flex">
          <Brand />
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cx(
                  'flex min-h-11 items-center gap-3 rounded-[10px] px-3 font-medium',
                  isActive ? 'bg-brand/15 font-semibold text-ink [&_svg]:text-brand' : 'text-ink-3 hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              <n.icon className="size-5" aria-hidden />
              {n.label}
            </NavLink>
          ))}
          <div className="mt-auto flex items-center gap-3 border-t border-line-soft px-3 pt-4">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold">{user.name}</span>
              <span className="truncate text-xs text-faint">{user.email}</span>
            </span>
            <button type="button" onClick={logout} aria-label="Salir" title="Salir" className="inline-flex size-11 items-center justify-center rounded-[10px] text-muted hover:bg-surface-2 hover:text-ink cursor-pointer">
              <LogOut className="size-[18px]" aria-hidden />
            </button>
          </div>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col pb-[76px] md:pb-0">
          <TopBar onPublish={() => setPublishOpen(true)} />
          <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 md:px-10 md:py-9">
            <Outlet />
          </main>
        </div>

        {/* Menú de abajo (celular) */}
        <nav aria-label="Menú del panel" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line-soft bg-sidebar px-2 pt-1.5 pb-[max(10px,env(safe-area-inset-bottom))] md:hidden">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cx('flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px]', isActive ? 'font-semibold text-ink [&_svg]:text-brand' : 'text-muted')
              }
            >
              <n.icon className="size-[22px]" aria-hidden />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <PublishDialog open={publishOpen} onClose={() => setPublishOpen(false)} />
    </PublishCtx.Provider>
  );
}

function Brand() {
  return (
    <div className="flex flex-col gap-0.5 px-3 pb-7">
      <span className="font-display text-2xl font-bold">
        Luna <span className="text-brand">Kuyen</span>
      </span>
      <span className="text-xs text-faint">Panel de tu sitio</span>
    </div>
  );
}

function TopBar({ onPublish }: { onPublish: () => void }) {
  const { state, saving, lastSavedAt } = useSite();
  const pending = state?.changes.length ?? 0;
  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-line-soft bg-ground/95 px-4 py-3 backdrop-blur md:px-10 md:py-4">
      <div className="flex items-center gap-4">
        <span className="font-display text-lg font-bold md:hidden">
          Luna <span className="text-brand">Kuyen</span>
        </span>
        <span className="hidden items-center gap-1.5 text-[13px] text-faint sm:inline-flex" aria-live="polite">
          {saving ? (
            <>
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Guardando…
            </>
          ) : lastSavedAt ? (
            <>
              <Check className="size-3.5 text-ok" aria-hidden /> Guardado
            </>
          ) : (
            'Todo se guarda solo'
          )}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {pending > 0 && (
          <span className="hidden items-center gap-2 text-[13px] text-pending lg:inline-flex">
            <span className="size-2 rounded-full bg-pending" />
            {pending === 1 ? '1 cambio sin publicar' : `${pending} cambios sin publicar`}
          </span>
        )}
        <a
          href={SITE_URL}
          target="_blank"
          rel="noreferrer"
          className="hidden min-h-11 items-center gap-2 rounded-[10px] border border-line-strong px-4 font-medium hover:bg-surface-2 sm:inline-flex"
        >
          Ver mi sitio <ExternalLink className="size-4" aria-hidden />
        </a>
        <button
          type="button"
          onClick={onPublish}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] bg-brand px-4 font-semibold text-brand-ink hover:bg-brand-soft"
        >
          <span>
            Publicar<span className="hidden sm:inline"> cambios</span>
          </span>
          {pending > 0 && (
            <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-brand-ink px-1.5 text-xs text-brand-soft">
              {pending}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
