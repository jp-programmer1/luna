import type { Section, Site } from './site';

export type SiteChange =
  | { kind: 'added'; sectionId: string; label: string }
  | { kind: 'removed'; sectionId: string; label: string }
  | { kind: 'edited'; sectionId: string; label: string }
  | { kind: 'hidden'; sectionId: string; label: string }
  | { kind: 'shown'; sectionId: string; label: string }
  | { kind: 'reordered' }
  | { kind: 'settings' };

/** Etiqueta para mostrarle a Luna: el título de la sección o su nombre en el menú. */
export function sectionLabel(s: Section): string {
  if (s.type === 'hero') return 'Portada';
  const title = 'title' in s.props ? s.props.title : '';
  return (title || s.navLabel).trim();
}

const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b)))
      : val,
  );

/**
 * Qué cambia entre lo publicado y el borrador, en términos de Luna.
 * Sin nada publicado todavía, todo cuenta como agregado.
 */
export function diffSites(published: Site | null, draft: Site): SiteChange[] {
  const changes: SiteChange[] = [];
  const before = new Map((published?.sections ?? []).map((s) => [s.id, s]));
  const after = new Map(draft.sections.map((s) => [s.id, s]));

  if (published && stable(published.settings) !== stable(draft.settings)) {
    changes.push({ kind: 'settings' });
  }

  for (const s of draft.sections) {
    const prev = before.get(s.id);
    const label = sectionLabel(s);
    if (!prev) {
      changes.push({ kind: 'added', sectionId: s.id, label });
      continue;
    }
    if (prev.visible !== s.visible) {
      changes.push({ kind: s.visible ? 'shown' : 'hidden', sectionId: s.id, label });
    }
    const { visible: _a, ...prevRest } = prev;
    const { visible: _b, ...rest } = s;
    if (stable(prevRest) !== stable(rest)) {
      changes.push({ kind: 'edited', sectionId: s.id, label });
    }
  }

  for (const s of published?.sections ?? []) {
    if (!after.has(s.id)) changes.push({ kind: 'removed', sectionId: s.id, label: sectionLabel(s) });
  }

  // Orden: solo entre las secciones que existen en ambos lados.
  const common = (list: Section[], other: Map<string, Section>) =>
    list.filter((s) => other.has(s.id)).map((s) => s.id).join(',');
  if (published && common(published.sections, after) !== common(draft.sections, before)) {
    changes.push({ kind: 'reordered' });
  }

  return changes;
}

/** Solo lo que ve el público: secciones visibles, en orden. */
export function publicView(site: Site): Site {
  return { settings: site.settings, sections: site.sections.filter((s) => s.visible) };
}
