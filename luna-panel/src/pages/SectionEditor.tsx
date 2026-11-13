import {
  BiographyProps,
  ContactProps,
  GalleryProps,
  HeroProps,
  TextProps,
  type Section,
} from '@luna/shared';
import { ArrowLeft, Copy, Info, Plus, Trash2, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Preview } from '../components/Preview';
import { RichTextEditor } from '../components/RichTextEditor';
import { Button, Card, CardTitle, cx, Field, IconButton, Input, Segmented, Spinner, Switch, Textarea } from '../components/ui';
import { api, SITE_URL } from '../lib/api';
import { SECTION_TYPES, sectionTitle } from '../lib/labels';
import { useSectionAutosave, useSite } from '../lib/site';

const schemas: Record<Section['type'], z.ZodType> = {
  hero: HeroProps,
  biography: BiographyProps,
  gallery: GalleryProps,
  contact: ContactProps,
  text: TextProps,
};

type Errors = Record<string, string>;

export function SectionEditor() {
  const { id = '' } = useParams();
  const { state } = useSite();
  if (!state) return <Spinner />;
  const section = state.draft.sections.find((s) => s.id === id);
  if (!section) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-ink-3">Esa sección ya no existe.</p>
        <Link to="/pagina" className="font-semibold text-brand-soft">Volver a Mi página</Link>
      </div>
    );
  }
  // key: al cambiar de sección se arranca con un formulario nuevo.
  return <Editor key={section.id} initial={section} version={state.version} />;
}

function Editor({ initial, version }: { initial: Section; version: number }) {
  const [section, setSection] = useState<Section>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const { save } = useSectionAutosave(initial.id);
  const { run, state } = useSite();
  const navigate = useNavigate();

  /** Cambio en el contenido: se valida acá y, si está bien, se guarda solo. */
  const setProps = (patch: Record<string, unknown>) => {
    const props = { ...section.props, ...patch };
    setSection({ ...section, props } as Section);
    const r = schemas[section.type].safeParse(props);
    if (r.success) {
      setErrors({});
      save({ props: r.data as Record<string, unknown> });
    } else {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), friendly(i.message, i.code)])));
    }
  };

  const setMeta = (patch: Partial<Pick<Section, 'navLabel' | 'showInNav' | 'visible' | 'variant'>>) => {
    setSection({ ...section, ...patch } as Section);
    if ('navLabel' in patch && !patch.navLabel?.trim()) {
      setErrors((e) => ({ ...e, navLabel: 'Ponele un nombre corto para el menú' }));
      return;
    }
    setErrors(({ navLabel: _, ...rest }) => rest);
    save(patch, { immediate: !('navLabel' in patch) });
  };

  const duplicate = () =>
    run((v) => api.duplicateSection(v, section.id))
      .then(() => toast.success('Listo, la duplicaste. Está justo abajo en Mi página.'))
      .catch(() => undefined);

  const remove = async () => {
    if (!window.confirm(`¿Borrar “${sectionTitle(section)}”? Si ya estaba publicada, sigue en tu sitio hasta que publiques.`)) return;
    try {
      await run((v) => api.removeSection(v, section.id));
      toast('Sección borrada. Si fue un error, podés descartar los cambios o restaurar una versión desde Ajustes.');
      navigate('/pagina');
    } catch {
      /* toast en useSite */
    }
  };

  const e = (path: string) => errors[path];
  const p = section.props as Record<string, unknown>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/pagina" className="inline-flex min-h-11 items-center gap-2 rounded-[10px] pr-3 pl-1 font-medium text-ink-3 hover:text-ink">
          <ArrowLeft className="size-[18px]" aria-hidden /> Mi página
        </Link>
        <span className="h-6 w-px bg-line" />
        <h1 className="font-display text-2xl font-bold">{sectionTitle(section)}</h1>
        <span className="text-[13px] text-faint">{SECTION_TYPES[section.type].name}</span>
      </div>

      <div role="tablist" aria-label="Modo" className="flex gap-1 rounded-xl border border-line bg-surface p-1 lg:hidden">
        {(['edit', 'preview'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cx('min-h-11 flex-1 cursor-pointer rounded-[9px] font-semibold', tab === t ? 'bg-brand text-brand-ink' : 'text-ink-3')}
          >
            {t === 'edit' ? 'Editar' : 'Vista previa'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-7">
        <form
          aria-label={`Editar ${sectionTitle(section)}`}
          onSubmit={(ev) => ev.preventDefault()}
          className={cx('flex w-full min-w-0 flex-col gap-5 lg:max-w-[460px] lg:flex-[1_1_400px]', tab === 'preview' && 'hidden lg:flex')}
        >
          <Card className="flex flex-col gap-[18px]">
            <CardTitle>Contenido</CardTitle>
            {section.type === 'hero' && <HeroForm props={section.props} set={setProps} e={e} sections={state?.draft.sections ?? []} />}
            {(section.type === 'biography' || section.type === 'text') && (
              <>
                <Field label="Título" error={e('title')} optional={section.type === 'text'}>
                  {(f) => <Input {...f} value={String(p.title)} maxLength={60} onChange={(ev) => setProps({ title: ev.target.value })} />}
                </Field>
                <Field label="Texto" error={e('body')} hint="Si pegás texto de otro lado, el formato raro se limpia solo.">
                  {(f) => <RichTextEditor id={f.id} describedBy={f['aria-describedby']} value={section.props.body} onChange={(body) => setProps({ body })} />}
                </Field>
              </>
            )}
            {section.type === 'biography' && (
              <>
                <div className="flex flex-col gap-2">
                  <span className="font-semibold">Foto</span>
                  <div className="flex items-start gap-4">
                    <img src={`${SITE_URL}/bio.jpg`} alt="" className="h-[140px] w-28 shrink-0 rounded-[10px] border border-line-strong object-cover" />
                    <Note>Muy pronto vas a poder cambiar la foto desde acá. Mientras tanto se usa la que ya está en tu sitio.</Note>
                  </div>
                </div>
                <Field label="Descripción de la foto" hint="Para Google y para personas que usan lectores de pantalla." error={e('imageAlt')}>
                  {(f) => <Input {...f} value={section.props.imageAlt} maxLength={140} onChange={(ev) => setProps({ imageAlt: ev.target.value })} />}
                </Field>
              </>
            )}
            {(section.type === 'gallery' || section.type === 'contact') && (
              <>
                <Field label="Bajada" hint="La línea chiquita en violeta arriba del título." error={e('eyebrow')} optional>
                  {(f) => <Input {...f} value={String(p.eyebrow)} maxLength={40} onChange={(ev) => setProps({ eyebrow: ev.target.value })} />}
                </Field>
                <Field label="Título" error={e('title')}>
                  {(f) => <Input {...f} value={String(p.title)} maxLength={60} onChange={(ev) => setProps({ title: ev.target.value })} />}
                </Field>
              </>
            )}
            {section.type === 'gallery' && (
              <>
                <Switch label="Mostrar filtros por tipo" description="Los botones de Fotos / Videos arriba de la galería." checked={section.props.showTypeFilter} onChange={(v) => setProps({ showTypeFilter: v })} />
                <Note>Las fotos y videos se siguen cargando en tu carpeta de Drive. Muy pronto los vas a poder subir y ordenar desde acá.</Note>
              </>
            )}
            {section.type === 'contact' && (
              <>
                <Field label="Texto de invitación" error={e('intro')} optional>
                  {(f) => <Textarea {...f} rows={3} value={section.props.intro} maxLength={300} onChange={(ev) => setProps({ intro: ev.target.value })} />}
                </Field>
                <Switch label="Mostrar formulario" description="Para que te escriban sin salir del sitio." checked={section.props.showForm} onChange={(v) => setProps({ showForm: v })} />
                <Note>
                  Tu mail, teléfono y redes se cambian en <Link to="/ajustes" className="font-semibold text-brand-soft underline">Ajustes</Link>.
                </Note>
              </>
            )}
          </Card>

          <Card className="flex flex-col gap-[18px]">
            <CardTitle>Cómo se ve</CardTitle>
            {section.type === 'biography' && (
              <Segmented
                label="Lado de la foto"
                value={section.props.imageSide}
                options={[{ value: 'left', label: 'Izquierda' }, { value: 'right', label: 'Derecha' }]}
                onChange={(v) => setProps({ imageSide: v })}
              />
            )}
            <Segmented
              label="Fondo"
              value={section.variant}
              options={[{ value: 'plain', label: 'Liso' }, { value: 'card', label: 'Con tarjeta' }]}
              onChange={(v) => setMeta({ variant: v })}
            />
            <div className="border-t border-line-soft pt-4">
              <Switch label="Mostrar en el sitio" description={section.visible ? 'Se ve cuando publiques.' : 'Oculta: no se ve, pero no se borra.'} checked={section.visible} onChange={(v) => setMeta({ visible: v })} />
            </div>
            <Switch label="Mostrar en el menú" checked={section.showInNav} onChange={(v) => setMeta({ showInNav: v })} />
            {section.showInNav && (
              <Field label="Nombre en el menú" error={e('navLabel')}>
                {(f) => <Input {...f} value={section.navLabel} maxLength={24} onChange={(ev) => setMeta({ navLabel: ev.target.value })} />}
              </Field>
            )}
          </Card>

          <div className="flex flex-wrap justify-between gap-3">
            <Button variant="secondary" onClick={duplicate}>
              <Copy className="size-4" aria-hidden /> Duplicar sección
            </Button>
            <Button variant="danger" onClick={remove}>
              <Trash2 className="size-4" aria-hidden /> Borrar sección
            </Button>
          </div>
        </form>

        <Preview
          version={version}
          anchor={section.visible ? section.anchor : undefined}
          className={cx('w-full lg:sticky lg:top-[92px] lg:flex-[999_1_520px]', tab === 'edit' && 'hidden lg:flex')}
        />
      </div>
    </div>
  );
}

function HeroForm({
  props,
  set,
  e,
  sections,
}: {
  props: z.infer<typeof HeroProps>;
  set: (patch: Record<string, unknown>) => void;
  e: (path: string) => string | undefined;
  sections: Section[];
}) {
  const setButton = (i: number, patch: Partial<{ label: string; href: string }>) =>
    set({ buttons: props.buttons.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  const anchors = sections.map((s) => ({ href: `#${s.anchor}`, label: sectionTitle(s) }));

  return (
    <>
      <Field label="Bajada" hint="La línea chiquita en violeta, arriba de tu nombre." error={e('eyebrow')} optional>
        {(f) => <Input {...f} value={props.eyebrow} maxLength={40} onChange={(ev) => set({ eyebrow: ev.target.value })} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Título" error={e('title')}>
          {(f) => <Input {...f} value={props.title} maxLength={60} onChange={(ev) => set({ title: ev.target.value })} />}
        </Field>
        <Field label="Segunda línea" hint="Sale en violeta." error={e('highlight')} optional>
          {(f) => <Input {...f} value={props.highlight} maxLength={40} onChange={(ev) => set({ highlight: ev.target.value })} />}
        </Field>
      </div>
      <Field label="Frase" error={e('subtitle')} optional>
        {(f) => <Input {...f} value={props.subtitle} maxLength={120} onChange={(ev) => set({ subtitle: ev.target.value })} />}
      </Field>
      <div className="flex flex-col gap-2.5">
        <span className="font-semibold">Botones</span>
        {props.buttons.map((b, i) => {
          const internal = anchors.some((a) => a.href === b.href);
          return (
            <div key={i} className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2/50 p-3">
              <div className="flex items-center gap-2">
                <Input aria-label={`Texto del botón ${i + 1}`} value={b.label} maxLength={30} onChange={(ev) => setButton(i, { label: ev.target.value })} />
                <IconButton label={`Quitar botón ${i + 1}`} onClick={() => set({ buttons: props.buttons.filter((_, j) => j !== i) })}>
                  <X className="size-[18px]" />
                </IconButton>
              </div>
              <select
                aria-label={`A dónde lleva el botón ${i + 1}`}
                value={internal ? b.href : '__link'}
                onChange={(ev) => setButton(i, { href: ev.target.value === '__link' ? 'https://' : ev.target.value })}
                className="min-h-11 rounded-[10px] border border-line-strong bg-surface-2 px-3 text-ink"
              >
                {anchors.map((a) => (
                  <option key={a.href} value={a.href}>
                    Lleva a: {a.label}
                  </option>
                ))}
                <option value="__link">Lleva a otro sitio (link)</option>
              </select>
              {!internal && <Input aria-label={`Link del botón ${i + 1}`} value={b.href} onChange={(ev) => setButton(i, { href: ev.target.value })} placeholder="https://" />}
              {e(`buttons.${i}.label`) && <span className="text-[13px] text-danger">{e(`buttons.${i}.label`)}</span>}
            </div>
          );
        })}
        {props.buttons.length < 2 && (
          <Button variant="ghost" className="self-start" onClick={() => set({ buttons: [...props.buttons, { label: 'Contacto', href: anchors.at(-1)?.href ?? '#' }] })}>
            <Plus className="size-4" aria-hidden /> Agregar botón
          </Button>
        )}
      </div>
    </>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2.5 rounded-[10px] bg-brand/[0.07] px-3.5 py-3 text-[13px] text-ink-3">
      <Info className="mt-0.5 size-4 shrink-0 text-brand-soft" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Mensajes de Zod en palabras de Luna. */
function friendly(message: string, code: string): string {
  if (code === 'too_small') return 'No puede quedar vacío';
  if (code === 'too_big') return 'Es demasiado largo';
  return message;
}
