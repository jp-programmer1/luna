import type { SectionType } from '@luna/shared';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../lib/api';
import { SECTION_TYPES, sectionTitle } from '../lib/labels';
import { useSite } from '../lib/site';
import { Modal } from './Modal';
import { SectionIcon } from './SectionIcon';
import { Button, cx } from './ui';

const ORDER: SectionType[] = ['text', 'biography', 'gallery', 'contact', 'hero'];

export function AddSectionDialog({ open, onClose, after }: { open: boolean; onClose: () => void; after?: string | null }) {
  const { state, run } = useSite();
  const navigate = useNavigate();
  const sections = state?.draft.sections ?? [];
  const [type, setType] = useState<SectionType>('text');
  const [position, setPosition] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setPosition(after ?? sections.at(-1)?.id ?? '');
    // solo al abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, after]);

  const add = async () => {
    setBusy(true);
    try {
      const before = new Set(sections.map((s) => s.id));
      const next = await run((v) => api.addSection(v, type, position || null));
      const created = next.draft.sections.find((s) => !before.has(s.id));
      onClose();
      if (created) navigate(`/pagina/${created.id}`);
    } catch {
      /* toast en useSite */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Agregar una sección" wide>
      <p className="-mt-3 text-[15px] text-ink-3">
        Elegí qué querés sumar. Se agrega con un ejemplo que después cambiás, y no aparece en tu sitio hasta que publiques.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ORDER.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={type === t}
            onClick={() => setType(t)}
            className={cx(
              'flex cursor-pointer items-start gap-3.5 rounded-[14px] border-2 bg-surface-2 p-4 text-left transition-colors',
              type === t ? 'border-brand bg-[#221b35]' : 'border-line hover:border-line-strong',
            )}
          >
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-brand/15 text-brand-soft">
              <SectionIcon type={t} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-base font-semibold">{SECTION_TYPES[t].name}</span>
              <span className="text-muted">{SECTION_TYPES[t].description}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line-soft pt-5">
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Ubicarla después de</span>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="min-h-11 min-w-60 rounded-[10px] border border-line-strong bg-surface-2 px-3 text-ink"
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {sectionTitle(s)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" loading={busy} onClick={add}>
            <Plus className="size-4" aria-hidden /> Agregar {SECTION_TYPES[type].name.toLowerCase()}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
