import { sectionLabel, type Section, type SectionType, type SiteChange } from '@luna/shared';

/** Cómo le llamamos a cada tipo de sección, en palabras de Luna. */
export const SECTION_TYPES: Record<SectionType, { name: string; description: string }> = {
  hero: { name: 'Portada', description: 'Lo primero que se ve: tu nombre, una línea y botones.' },
  biography: { name: 'Texto con foto', description: 'Una foto con un texto al lado. Ideal para tu biografía.' },
  gallery: { name: 'Galería', description: 'Tus fotos y videos, con filtros por tipo y categoría.' },
  contact: { name: 'Contacto', description: 'Tus datos, redes y un formulario para que te escriban.' },
  text: { name: 'Texto libre', description: 'Un título y un texto con negritas, links y listas.' },
};

export function sectionTitle(s: Section): string {
  return sectionLabel(s);
}

/** Una línea para recordar qué tiene cada sección en la lista. */
export function sectionSummary(s: Section): string {
  switch (s.type) {
    case 'hero':
      return [s.props.eyebrow, `${s.props.title} ${s.props.highlight}`.trim(), s.props.subtitle].filter(Boolean).join(' · ');
    case 'biography':
    case 'text': {
      const first = s.props.body.content.find((b) => b.type === 'paragraph');
      const text = first && 'content' in first ? (first.content ?? []).map((n) => ('text' in n ? n.text : ' ')).join('') : '';
      return text || 'Sin texto todavía';
    }
    case 'gallery':
      return 'Fotos y videos de tu galería';
    case 'contact':
      return s.props.showForm ? 'Datos, redes y formulario' : 'Datos y redes';
  }
}

export function changeText(c: SiteChange): string {
  switch (c.kind) {
    case 'added':
      return `Agregaste la sección “${c.label}”`;
    case 'removed':
      return `Borraste la sección “${c.label}”`;
    case 'edited':
      return `Editaste “${c.label}”`;
    case 'hidden':
      return `Ocultaste “${c.label}”`;
    case 'shown':
      return `Volviste a mostrar “${c.label}”`;
    case 'reordered':
      return 'Cambiaste el orden de las secciones';
    case 'settings':
      return 'Cambiaste los datos del sitio';
  }
}

const dateFmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' });
const timeFmt = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' });

/** "Hoy, 18:40", "Ayer, 10:05" o "8 de noviembre, 18:12". */
export function friendlyDate(iso: string | number): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const day = same(d, today) ? 'Hoy' : same(d, yesterday) ? 'Ayer' : dateFmt.format(d);
  return `${day}, ${timeFmt.format(d)}`;
}
