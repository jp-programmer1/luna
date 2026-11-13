import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Section } from '@luna/shared';
import { ArrowDown, ArrowUp, Copy, EllipsisVertical, Eye, EyeOff, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { AddSectionDialog } from '../components/AddSectionDialog';
import { SectionIcon } from '../components/SectionIcon';
import { Badge, Button, Card, cx, IconButton, PageHeader, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { SECTION_TYPES, sectionSummary, sectionTitle } from '../lib/labels';
import { useSite } from '../lib/site';

export function Sections() {
  const { state, run } = useSite();
  const [params, setParams] = useSearchParams();
  const [addOpen, setAddOpen] = useState(params.get('agregar') === '1');
  const [addAfter, setAddAfter] = useState<string | null>(null);
  const [order, setOrder] = useState<string[] | null>(null); // orden optimista mientras se guarda
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!state) return <Spinner />;
  const byId = new Map(state.draft.sections.map((s) => [s.id, s]));
  const ids = (order ?? state.draft.sections.map((s) => s.id)).filter((id) => byId.has(id) && !deleting.has(id));
  const sections = ids.map((id) => byId.get(id)!);
  const changed = new Map(state.changes.flatMap((c) => ('sectionId' in c ? [[c.sectionId, c.kind] as const] : [])));

  const saveOrder = async (next: string[]) => {
    setOrder(next);
    const full = [...next, ...state.draft.sections.map((s) => s.id).filter((id) => !next.includes(id))];
    try {
      await run((v) => api.reorder(v, full));
    } finally {
      setOrder(null);
    }
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    void saveOrder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  const move = (id: string, delta: -1 | 1) => {
    const i = ids.indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    void saveOrder(arrayMove(ids, i, j));
  };

  const toggle = (s: Section) => {
    run((v) => api.updateSection(v, s.id, { visible: !s.visible }))
      .then(() => toast(s.visible ? `“${sectionTitle(s)}” ya no se ve en tu sitio (cuando publiques).` : `“${sectionTitle(s)}” vuelve a verse (cuando publiques).`))
      .catch(() => undefined);
  };

  const duplicate = (s: Section) => {
    run((v) => api.duplicateSection(v, s.id))
      .then(() => toast.success(`Duplicaste “${sectionTitle(s)}”.`))
      .catch(() => undefined);
  };

  /** Borrar con red: la sección desaparece ya, pero se borra de verdad recién si no tocás "Deshacer". */
  const remove = (s: Section) => {
    setDeleting((d) => new Set(d).add(s.id));
    let settled = false;
    const restore = () => setDeleting((d) => {
      const n = new Set(d);
      n.delete(s.id);
      return n;
    });
    const commit = () => {
      if (settled) return;
      settled = true;
      run((v) => api.removeSection(v, s.id)).catch(() => undefined).finally(restore);
    };
    toast(`Borraste “${sectionTitle(s)}”.`, {
      duration: 6000,
      action: {
        label: 'Deshacer',
        onClick: () => {
          settled = true;
          restore();
        },
      },
      onAutoClose: commit,
      onDismiss: commit,
    });
  };

  const navItems = sections.filter((s) => s.visible && s.showInNav).map((s) => s.navLabel);

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Mi página"
        description="Así está armado tu sitio, de arriba a abajo. Arrastrá desde los puntitos para cambiar el orden. El ojo oculta una sección sin borrarla."
        actions={
          <Button onClick={() => { setAddAfter(null); setAddOpen(true); }}>
            <Plus className="size-[18px]" aria-hidden /> Agregar sección
          </Button>
        }
      />

      <div className="flex flex-wrap items-start gap-7">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ol aria-label="Secciones de tu página" className="flex min-w-0 flex-[999_1_520px] flex-col gap-2.5">
              {sections.map((s, i) => (
                <SectionRow
                  key={s.id}
                  section={s}
                  kind={changed.get(s.id)}
                  first={i === 0}
                  last={i === sections.length - 1}
                  onToggle={() => toggle(s)}
                  onDuplicate={() => duplicate(s)}
                  onRemove={() => remove(s)}
                  onMove={(d) => move(s.id, d)}
                  onAddAfter={() => { setAddAfter(s.id); setAddOpen(true); }}
                />
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => { setAddAfter(null); setAddOpen(true); }}
                  className="flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-[#4b3f6b] font-semibold text-brand-soft hover:bg-brand/5"
                >
                  <Plus className="size-[18px]" aria-hidden /> Agregar sección
                </button>
              </li>
            </ol>
          </SortableContext>
        </DndContext>

        <aside className="flex flex-[1_1_260px] flex-col gap-4">
          <Card>
            <h2 className="mb-3.5 text-[15px] font-semibold">Así queda el menú de tu sitio</h2>
            <div className="flex flex-col gap-2.5 rounded-xl border border-surface-2 bg-[#06040b] px-4 py-3.5">
              <span className="font-display text-base font-bold">
                {state.draft.settings.name.split(' ')[0]} <span className="text-brand">{state.draft.settings.name.split(' ').slice(1).join(' ')}</span>
              </span>
              <div className="flex flex-wrap gap-x-3.5 gap-y-1.5">
                {navItems.length ? navItems.map((l, i) => (
                  <span key={i} className="text-[11px] tracking-[0.12em] text-muted uppercase">{l}</span>
                )) : <span className="text-[13px] text-faint">Sin links en el menú</span>}
              </div>
            </div>
            <p className="mt-3.5 text-[13px] text-muted">Probá ocultar una sección: el menú se actualiza solo.</p>
          </Card>
          <Card>
            <h2 className="mb-3 text-[15px] font-semibold">Tranquila, nada se rompe</h2>
            <p className="text-ink-3">
              Todo lo que cambies acá queda en borrador. Tu sitio cambia recién cuando tocás <strong className="text-ink">Publicar cambios</strong>.
            </p>
            <p className="mt-3 text-ink-3">Si borrás algo por error, tenés unos segundos para deshacerlo, y siempre podés volver a una versión anterior.</p>
          </Card>
        </aside>
      </div>

      <AddSectionDialog
        open={addOpen}
        after={addAfter}
        onClose={() => {
          setAddOpen(false);
          if (params.has('agregar')) setParams({}, { replace: true });
        }}
      />
    </div>
  );
}

function SectionRow({
  section: s,
  kind,
  first,
  last,
  onToggle,
  onDuplicate,
  onRemove,
  onMove,
  onAddAfter,
}: {
  section: Section;
  kind: string | undefined;
  first: boolean;
  last: boolean;
  onToggle: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMove: (d: -1 | 1) => void;
  onAddAfter: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  const title = sectionTitle(s);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx(
        'flex items-center gap-2 rounded-[14px] border bg-surface py-2 pr-2 pl-1 sm:gap-3.5',
        isDragging ? 'relative z-10 border-brand shadow-xl shadow-black/40' : 'border-line',
        !s.visible && 'opacity-60',
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Mover ${title}. Con el teclado: espacio y flechas.`}
        className="inline-flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-[#6f6985] active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-[18px]" aria-hidden />
      </button>
      <span className="hidden size-11 shrink-0 items-center justify-center rounded-[10px] border border-line bg-[#1e1a29] text-brand-soft sm:inline-flex">
        <SectionIcon type={s.type} />
      </span>
      <Link to={`/pagina/${s.id}`} className="flex min-w-0 flex-1 flex-col py-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold">{title}</span>
          <span className="text-xs text-faint">{SECTION_TYPES[s.type].name}</span>
          {!s.visible ? <Badge tone="muted">Oculta</Badge> : kind === 'added' ? <Badge>Nueva</Badge> : kind ? <Badge tone="pending">Con cambios</Badge> : null}
        </span>
        <span className="truncate text-muted">{sectionSummary(s)}</span>
      </Link>
      <button
        type="button"
        onClick={onToggle}
        aria-label={s.visible ? `Ocultar ${title}` : `Mostrar ${title}`}
        className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3 text-[13px] text-ink-2 hover:border-line-strong sm:min-w-[104px]"
      >
        {s.visible ? <Eye className="size-[18px]" aria-hidden /> : <EyeOff className="size-[18px]" aria-hidden />}
        <span className="hidden sm:inline">{s.visible ? 'Visible' : 'Oculta'}</span>
      </button>
      <Link
        to={`/pagina/${s.id}`}
        className="hidden min-h-11 shrink-0 items-center gap-2 rounded-[10px] bg-brand/15 px-3.5 font-semibold text-[#ddd6fe] hover:bg-brand/25 md:inline-flex"
      >
        <Pencil className="size-4" aria-hidden /> Editar
      </Link>
      <RowMenu
        title={title}
        first={first}
        last={last}
        onMove={onMove}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
        onAddAfter={onAddAfter}
      />
    </li>
  );
}

function RowMenu({
  title,
  first,
  last,
  onMove,
  onDuplicate,
  onRemove,
  onAddAfter,
}: {
  title: string;
  first: boolean;
  last: boolean;
  onMove: (d: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onAddAfter: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const item = (label: string, Icon: typeof Copy, onClick: () => void, opts: { danger?: boolean; disabled?: boolean } = {}) => (
    <button
      type="button"
      role="menuitem"
      disabled={opts.disabled}
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className={cx(
        'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left disabled:cursor-default disabled:opacity-40',
        opts.danger ? 'text-danger hover:bg-danger/10' : 'hover:bg-surface-2',
      )}
    >
      <Icon className="size-4" aria-hidden /> {label}
    </button>
  );

  return (
    <div ref={ref} className="relative">
      <IconButton label={`Más opciones para ${title}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <EllipsisVertical className="size-[18px]" />
      </IconButton>
      {open && (
        <div role="menu" className="absolute top-12 right-0 z-30 w-56 rounded-xl border border-line-strong bg-surface p-1.5 shadow-2xl shadow-black/50">
          {item('Subir', ArrowUp, () => onMove(-1), { disabled: first })}
          {item('Bajar', ArrowDown, () => onMove(1), { disabled: last })}
          {item('Agregar una sección abajo', Plus, onAddAfter)}
          {item('Duplicar', Copy, onDuplicate)}
          <div className="my-1 border-t border-line-soft" />
          {item('Borrar', Trash2, onRemove, { danger: true })}
        </div>
      )}
    </div>
  );
}
