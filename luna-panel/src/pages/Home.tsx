import { CircleCheck, GripVertical, Pencil, Plus, User } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useOpenPublish } from '../components/Layout';
import { useDiscard } from '../components/PublishDialog';
import { Badge, Button, Card, Spinner } from '../components/ui';
import { changeText, friendlyDate, sectionTitle } from '../lib/labels';
import { useSite } from '../lib/site';

export function Home() {
  const { state } = useSite();
  const openPublish = useOpenPublish();
  const discard = useDiscard();
  if (!state) return <Spinner />;

  const { draft, changes, publishedAt } = state;
  const bio = draft.sections.find((s) => s.type === 'biography');
  const changed = new Map(changes.flatMap((c) => ('sectionId' in c ? [[c.sectionId, c.kind] as const] : [])));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-display text-4xl font-bold md:text-[40px]">Hola, {draft.settings.name.split(' ')[0]}</h1>
        <p className="text-base text-ink-3">Desde acá cambiás todo lo que se ve en tu sitio. Nada se publica hasta que vos lo decidas.</p>
      </header>

      {changes.length > 0 ? (
        <section aria-label="Estado del sitio" className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-[#4a3a24] bg-[#1a1510] p-6">
          <div className="flex min-w-[260px] flex-1 items-start gap-4">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-pending/15">
              <Pencil className="size-5 text-pending" aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">
                {changes.length === 1 ? 'Tenés 1 cambio sin publicar' : `Tenés ${changes.length} cambios sin publicar`}
              </h2>
              <p className="text-ink-3">
                {publishedAt ? `La gente todavía ve la versión publicada ${friendlyDate(publishedAt).toLowerCase()}.` : 'Todavía no publicaste nada.'}{' '}
                {changes.slice(0, 2).map(changeText).join(' · ')}
                {changes.length > 2 && '…'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={discard}>
              Descartar cambios
            </Button>
            <Button variant="primary" onClick={openPublish}>
              Revisar y publicar
            </Button>
          </div>
        </section>
      ) : (
        <section aria-label="Estado del sitio" className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-6">
          <CircleCheck className="size-7 shrink-0 text-ok" aria-hidden />
          <p className="text-ink-3">
            <strong className="text-ink">Tu sitio está al día.</strong>{' '}
            {publishedAt && `Última publicación: ${friendlyDate(publishedAt).toLowerCase()}.`}
          </p>
        </section>
      )}

      <section aria-labelledby="atajos" className="flex flex-col gap-3.5">
        <h2 id="atajos" className="text-[13px] font-semibold tracking-[0.08em] text-faint uppercase">
          ¿Qué querés hacer?
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {bio && <Shortcut to={`/pagina/${bio.id}`} icon={<User />} title="Editar mi biografía" text="Tu texto de presentación y tu foto" />}
          <Shortcut to="/pagina?agregar=1" icon={<Plus />} title="Agregar una sección" text="Un texto, otra foto, otra galería…" />
          <Shortcut to="/pagina" icon={<GripVertical />} title="Ordenar mi página" text="Cambiá el orden u ocultá secciones" />
        </div>
      </section>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3 pb-3">
          <h2 className="text-lg font-semibold">Tu página, de arriba a abajo</h2>
          <Link to="/pagina" className="inline-flex min-h-11 items-center font-medium text-brand-soft hover:text-ink">
            Ordenar
          </Link>
        </div>
        <ol>
          {draft.sections.map((s, i) => {
            const kind = changed.get(s.id);
            return (
              <li key={s.id} className="border-t border-line-soft">
                <Link to={`/pagina/${s.id}`} className="flex min-h-12 items-center gap-3 py-2 hover:text-brand-soft">
                  <span className="w-6 text-[13px] text-faint">{i + 1}</span>
                  <span className={s.visible ? 'flex-1 font-medium' : 'flex-1 font-medium text-faint'}>{sectionTitle(s)}</span>
                  {!s.visible ? (
                    <Badge tone="muted">Oculta</Badge>
                  ) : kind === 'added' ? (
                    <Badge>Nueva</Badge>
                  ) : kind ? (
                    <Badge tone="pending">Con cambios</Badge>
                  ) : (
                    <span className="text-[13px] text-faint">Visible</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}

function Shortcut({ to, icon, title, text }: { to: string; icon: ReactNode; title: string; text: string }) {
  return (
    <Link to={to} className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-5 hover:border-line-strong hover:bg-surface-2">
      <span className="inline-flex size-10 items-center justify-center rounded-[10px] bg-brand/15 text-brand-soft [&_svg]:size-5">{icon}</span>
      <span className="text-base font-semibold">{title}</span>
      <span className="text-muted">{text}</span>
    </Link>
  );
}
