import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SiteChange } from '@luna/shared';
import { CircleCheck, ExternalLink, EyeOff, Pencil, Plus, RotateCcw, Settings2, Trash2, ArrowDownUp, Eye } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api, SITE_URL } from '../lib/api';
import { changeText, friendlyDate } from '../lib/labels';
import { useSite } from '../lib/site';
import { Modal } from './Modal';
import { Badge, Button, Field, Input } from './ui';

const icons: Record<SiteChange['kind'], typeof Pencil> = {
  added: Plus,
  removed: Trash2,
  edited: Pencil,
  hidden: EyeOff,
  shown: Eye,
  reordered: ArrowDownUp,
  settings: Settings2,
};

export function PublishDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, run } = useSite();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const changes = state?.changes ?? [];

  const close = () => {
    onClose();
    setDone(false);
    setNote('');
  };

  const publish = async () => {
    setBusy(true);
    try {
      const res = await run((v) => api.publish(v, note.trim() || undefined));
      await qc.invalidateQueries({ queryKey: ['revisions'] });
      setDone(true);
      if (!res.revalidated) {
        // Sin revalidación (local o falla de Vercel) el sitio se actualiza solo en hasta 1 h.
        console.info('Publicado sin revalidar el portafolio');
      }
    } catch {
      /* el toast ya lo mostró useSite */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title={done ? '¡Listo! Tu sitio ya está actualizado' : 'Publicar cambios'}>
      {done ? <Published onClose={close} /> : changes.length === 0 ? (
        <div className="flex flex-col gap-5">
          <p className="text-[15px] text-ink-3">No hay cambios sin publicar: lo que ves en el panel es lo que está en tu sitio.</p>
          <div className="flex justify-end">
            <Button variant="primary" onClick={close}>
              Entendido
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="-mt-2 text-[15px] text-ink-3">Esto es lo que va a cambiar en tu sitio:</p>
          <ul className="flex flex-col overflow-hidden rounded-[14px] border border-line">
            {changes.map((c, i) => {
              const Icon = icons[c.kind];
              return (
                <li key={i} className="flex items-center gap-3.5 border-t border-line bg-surface-2 px-4 py-3 first:border-t-0">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand/15 text-brand-soft">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span>{changeText(c)}</span>
                </li>
              );
            })}
          </ul>
          <Field label="Nota para acordarte" optional hint="Te ayuda a reconocer esta versión en el historial.">
            {(p) => (
              <Input {...p} value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: bio nueva para la temporada de verano" />
            )}
          </Field>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={close}>
              Seguir editando
            </Button>
            <Button variant="primary" loading={busy} onClick={publish}>
              Publicar ahora
            </Button>
          </div>
          <p className="border-t border-line-soft pt-4 text-[13px] text-muted">
            Si después algo no te gusta, podés volver a cualquier versión anterior desde Ajustes. Nada se pierde.
          </p>
        </div>
      )}
    </Modal>
  );
}

function Published({ onClose }: { onClose: () => void }) {
  const revisions = useQuery({ queryKey: ['revisions'], queryFn: api.revisions });
  return (
    <div className="flex flex-col gap-6">
      <div className="-mt-2 flex items-start gap-3">
        <CircleCheck className="size-6 shrink-0 text-ok" aria-hidden />
        <p className="text-[15px] text-ink-3">En unos segundos se ve en todos lados, también en el celular.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <a
          href={SITE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-brand px-4 font-semibold text-brand-ink hover:bg-brand-soft"
        >
          Ver mi sitio <ExternalLink className="size-4" aria-hidden />
        </a>
        <Button onClick={onClose}>Volver al panel</Button>
      </div>
      {revisions.data && revisions.data.length > 1 && (
        <div className="flex flex-col gap-2 border-t border-line-soft pt-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <RotateCcw className="size-4 text-muted" aria-hidden /> Versiones anteriores
          </div>
          {revisions.data.slice(0, 3).map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-line-soft px-3.5 py-2.5">
              <span className="flex flex-1 flex-col">
                <span className="font-medium">{friendlyDate(r.createdAt)}</span>
                <span className="text-[13px] text-muted">{r.note || 'Sin nota'}</span>
              </span>
              {r.live && <Badge tone="ok">En línea</Badge>}
            </div>
          ))}
          <p className="text-[13px] text-muted">Para volver a una, entrá a Ajustes › Historial.</p>
        </div>
      )}
    </div>
  );
}

/** Descartar con confirmación: es lo único del panel que no se puede deshacer. */
export function useDiscard() {
  const { run } = useSite();
  return async () => {
    if (!window.confirm('¿Descartar todos los cambios sin publicar? Tu borrador vuelve a quedar igual a lo que está en el sitio.')) return;
    try {
      await run((v) => api.discard(v));
      toast.success('Listo, descartaste los cambios.');
    } catch {
      /* toast en useSite */
    }
  };
}
