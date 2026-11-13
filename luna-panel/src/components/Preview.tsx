import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Monitor, Smartphone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, SITE_URL } from '../lib/api';
import { cx } from './ui';

/**
 * El sitio real con el borrador, en un iframe. Se recarga después de cada
 * guardado (cambia `version`) y salta a la sección que se está editando.
 */
export function Preview({ version, anchor, className }: { version: number; anchor?: string; className?: string }) {
  // En el celular arranca mostrando cómo se ve en celular.
  const [device, setDevice] = useState<'desktop' | 'mobile'>(() => (window.innerWidth < 768 ? 'mobile' : 'desktop'));
  const token = useQuery({
    queryKey: ['preview-token'],
    queryFn: api.previewToken,
    staleTime: 25 * 60 * 1000, // el token dura 30 min
    refetchInterval: 25 * 60 * 1000,
  });

  // Recargar recién cuando se calma la escritura, no en cada tecla.
  const [shownVersion, setShownVersion] = useState(version);
  useEffect(() => {
    const t = window.setTimeout(() => setShownVersion(version), 500);
    return () => window.clearTimeout(t);
  }, [version]);

  // En "Compu" el sitio se dibuja a 1280 px y se achica para entrar en el panel,
  // así se ve la versión de escritorio real y no la de celular.
  const box = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setBoxWidth(e.contentRect.width));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  const DESKTOP = 1280;
  const scale = device === 'desktop' && boxWidth > 0 && boxWidth < DESKTOP ? boxWidth / DESKTOP : 1;

  const src = token.data ? `${SITE_URL}/preview/${token.data.token}?v=${shownVersion}${anchor ? `#${anchor}` : ''}` : null;

  return (
    <section aria-label="Vista previa" className={cx('flex min-w-0 flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h2 className="text-[15px] font-semibold">Vista previa</h2>
          <span className="text-[13px] text-muted">Así se va a ver cuando publiques.</span>
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Tamaño de pantalla" className="flex gap-1 rounded-xl border border-line bg-surface p-1">
            {(['desktop', 'mobile'] as const).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={device === d}
                onClick={() => setDevice(d)}
                className={cx(
                  'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-semibold',
                  device === d ? 'bg-[#2a2142] text-ink' : 'text-ink-3 hover:text-ink',
                )}
              >
                {d === 'desktop' ? <Monitor className="size-[15px]" aria-hidden /> : <Smartphone className="size-[15px]" aria-hidden />}
                {d === 'desktop' ? 'Compu' : 'Celular'}
              </button>
            ))}
          </div>
          {src && (
            <a href={src} target="_blank" rel="noreferrer" aria-label="Abrir vista previa en otra pestaña" title="Abrir en otra pestaña" className="inline-flex size-11 items-center justify-center rounded-[10px] text-muted hover:bg-surface-2 hover:text-ink">
              <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
        </div>
      </div>
      <div
        ref={box}
        className={cx('flex h-[calc(100vh-210px)] min-h-[480px] overflow-hidden rounded-2xl border border-line bg-[#06040b]', scale < 1 ? 'justify-start' : 'justify-center')}
      >
        {src ? (
          device === 'desktop' && scale < 1 ? (
            <iframe
              key={src}
              src={src}
              title="Vista previa de tu sitio"
              className="shrink-0 origin-top-left bg-[#06040b]"
              style={{ width: DESKTOP, height: `${100 / scale}%`, transform: `scale(${scale})` }}
            />
          ) : (
            <iframe
              key={src}
              src={src}
              title="Vista previa de tu sitio"
              className={cx('h-full bg-[#06040b]', device === 'mobile' ? 'w-[390px] max-w-full' : 'w-full')}
            />
          )
        ) : (
          <div className="flex items-center text-muted">{token.error ? 'No se pudo abrir la vista previa.' : 'Abriendo la vista previa…'}</div>
        )}
      </div>
    </section>
  );
}
