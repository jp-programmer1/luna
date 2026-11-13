import { useQuery } from '@tanstack/react-query';
import { Settings as SettingsSchema, type Settings } from '@luna/shared';
import { History, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDiscard } from '../components/PublishDialog';
import { Badge, Button, Card, CardTitle, Field, IconButton, Input, PageHeader, Spinner, Textarea } from '../components/ui';
import { api } from '../lib/api';
import { friendlyDate } from '../lib/labels';
import { useSite } from '../lib/site';

const NETWORKS: { value: Settings['socials'][number]['network']; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'other', label: 'Otro link' },
];

export function SettingsPage() {
  const { state } = useSite();
  if (!state) return <Spinner />;
  return (
    <div className="flex flex-col gap-7">
      <PageHeader title="Ajustes" description="Los datos que aparecen en todo el sitio y el historial de lo que publicaste." />
      <div className="flex flex-wrap items-start gap-7">
        <SiteSettings initial={state.draft.settings} />
        <RevisionHistory />
      </div>
    </div>
  );
}

function SiteSettings({ initial }: { initial: Settings }) {
  const { run } = useSite();
  const [s, setS] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(s);

  // Guardar lo que haya quedado al salir de la pantalla.
  useEffect(
    () => () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        const r = SettingsSchema.safeParse(latest.current);
        if (r.success) run((v) => api.updateSettings(v, r.data)).catch(() => undefined);
      }
    },
    [run],
  );

  const update = (next: Settings) => {
    setS(next);
    latest.current = next;
    const r = SettingsSchema.safeParse(next);
    window.clearTimeout(timer.current);
    if (!r.success) {
      timer.current = undefined;
      setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.code === 'too_small' ? 'No puede quedar vacío' : i.code === 'invalid_format' ? 'Revisá que esté bien escrito' : i.message])));
      return;
    }
    setErrors({});
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      run((v) => api.updateSettings(v, r.data)).catch(() => undefined);
    }, 700);
  };

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => update({ ...s, [k]: v });
  const e = (p: string) => errors[p];

  return (
    <form onSubmit={(ev) => ev.preventDefault()} className="flex min-w-0 flex-[999_1_480px] flex-col gap-5">
      <Card className="flex flex-col gap-[18px]">
        <CardTitle>Contacto</CardTitle>
        <Field label="Mail" error={e('contact.email')} hint="Aparece en el sitio y es a donde llegan los mensajes del formulario.">
          {(f) => <Input {...f} type="email" value={s.contact.email} onChange={(ev) => set('contact', { ...s.contact, email: ev.target.value })} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teléfono" optional error={e('contact.phone')}>
            {(f) => <Input {...f} type="tel" value={s.contact.phone ?? ''} onChange={(ev) => set('contact', { ...s.contact, phone: ev.target.value || null })} />}
          </Field>
          <Field label="Ubicación" optional error={e('contact.location')}>
            {(f) => <Input {...f} value={s.contact.location ?? ''} onChange={(ev) => set('contact', { ...s.contact, location: ev.target.value || null })} />}
          </Field>
        </div>
      </Card>

      <Card className="flex flex-col gap-3.5">
        <CardTitle>Redes</CardTitle>
        {s.socials.map((so, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <select
                aria-label={`Red ${i + 1}`}
                value={so.network}
                onChange={(ev) => set('socials', s.socials.map((x, j) => (j === i ? { ...x, network: ev.target.value as typeof so.network } : x)))}
                className="min-h-11 w-36 shrink-0 rounded-[10px] border border-line-strong bg-surface-2 px-3 text-ink"
              >
                {NETWORKS.map((n) => (
                  <option key={n.value} value={n.value}>{n.label}</option>
                ))}
              </select>
              <Input
                aria-label={`Link de la red ${i + 1}`}
                aria-invalid={e(`socials.${i}.url`) ? true : undefined}
                value={so.url}
                placeholder="https://"
                onChange={(ev) => set('socials', s.socials.map((x, j) => (j === i ? { ...x, url: ev.target.value } : x)))}
              />
              <IconButton label={`Quitar red ${i + 1}`} onClick={() => set('socials', s.socials.filter((_, j) => j !== i))}>
                <X className="size-[18px]" />
              </IconButton>
            </div>
            {e(`socials.${i}.url`) && <span className="text-[13px] text-danger">Pegá el link completo, empezando con https://</span>}
          </div>
        ))}
        {s.socials.length < 10 && (
          <Button variant="ghost" className="self-start" onClick={() => set('socials', [...s.socials, { network: 'instagram', url: 'https://' }])}>
            <Plus className="size-4" aria-hidden /> Agregar red
          </Button>
        )}
      </Card>

      <Card className="flex flex-col gap-[18px]">
        <CardTitle>Cómo aparece en Google y WhatsApp</CardTitle>
        <Field label="Nombre del sitio" error={e('name')} hint="Se usa en el menú y al compartir el link.">
          {(f) => <Input {...f} value={s.name} maxLength={60} onChange={(ev) => set('name', ev.target.value)} />}
        </Field>
        <Field label="Título" error={e('seo.title')} hint={`${s.seo.title.length}/70. Lo que se ve en la pestaña y en Google.`}>
          {(f) => <Input {...f} value={s.seo.title} maxLength={70} onChange={(ev) => set('seo', { ...s.seo, title: ev.target.value })} />}
        </Field>
        <Field label="Descripción" error={e('seo.description')} hint={`${s.seo.description.length}/160. El textito abajo del título en Google.`}>
          {(f) => <Textarea {...f} rows={3} value={s.seo.description} maxLength={160} onChange={(ev) => set('seo', { ...s.seo, description: ev.target.value })} />}
        </Field>
        <div className="rounded-xl border border-line bg-white p-4 text-left" aria-label="Así se vería en Google">
          <p className="text-[13px] text-[#4d5156]">lunakuyen.art</p>
          <p className="text-lg leading-snug text-[#1a0dab]">{s.seo.title || 'Título'}</p>
          <p className="text-[13px] text-[#4d5156]">{s.seo.description || 'Descripción'}</p>
        </div>
        <Field label="Texto del pie de página" error={e('footerText')} hint="Va después de © y el año.">
          {(f) => <Input {...f} value={s.footerText} maxLength={120} onChange={(ev) => set('footerText', ev.target.value)} />}
        </Field>
      </Card>
    </form>
  );
}

function RevisionHistory() {
  const { state, run } = useSite();
  const discard = useDiscard();
  const revisions = useQuery({ queryKey: ['revisions'], queryFn: api.revisions });
  const [restoring, setRestoring] = useState<string | null>(null);

  const restore = async (id: string, label: string) => {
    if (!window.confirm(`¿Cargar la versión del ${label} en tu borrador? No se publica sola: la vas a poder revisar antes.`)) return;
    setRestoring(id);
    try {
      await run((v) => api.restore(v, id));
      toast.success('Listo. Revisala y, si te gusta, publicala.');
    } catch {
      /* toast en useSite */
    } finally {
      setRestoring(null);
    }
  };

  return (
    <Card className="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
      <div className="flex items-center gap-2">
        <History className="size-[18px] text-muted" aria-hidden />
        <h2 className="text-[15px] font-semibold">Historial de versiones</h2>
      </div>
      {revisions.isLoading && <Spinner />}
      {revisions.data?.map((r) => {
        const label = friendlyDate(r.createdAt);
        return (
          <div key={r.id} className={r.live ? 'flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3' : 'flex items-center gap-3 rounded-xl border border-line-soft px-3.5 py-3'}>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold">{label}</span>
              <span className="truncate text-[13px] text-muted">
                {r.note || 'Sin nota'}
                {r.createdBy ? ` · ${r.createdBy}` : ''}
              </span>
            </span>
            {r.live ? (
              <Badge tone="ok">En línea</Badge>
            ) : (
              <Button className="min-h-10 px-3 text-[13px]" loading={restoring === r.id} onClick={() => restore(r.id, label.toLowerCase())}>
                Restaurar
              </Button>
            )}
          </div>
        );
      })}
      <p className="text-[13px] text-muted">Restaurar no publica nada: carga esa versión como borrador para que la revises antes.</p>
      {state && state.changes.length > 0 && (
        <div className="mt-2 flex flex-col gap-2 border-t border-line-soft pt-4">
          <p className="text-[13px] text-ink-3">¿Querés volver a dejar todo como está publicado?</p>
          <Button variant="danger" className="self-start" onClick={discard}>
            Descartar cambios sin publicar
          </Button>
        </div>
      )}
    </Card>
  );
}
