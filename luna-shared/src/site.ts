import { z } from 'zod';
import { RichText, richTextFromPlain } from './rich-text';

/** _id de un documento de la colección media (ObjectId en hex). */
export const MediaId = z.string().regex(/^[a-f0-9]{24}$/, 'mediaId inválido');

const Url = z.string().url().max(2048);

/* ---------- Ajustes globales ---------- */

export const SocialNetwork = z.enum([
  'instagram',
  'youtube',
  'facebook',
  'tiktok',
  'spotify',
  'other',
]);

export const Settings = z.object({
  name: z.string().min(1).max(60),
  seo: z.object({
    title: z.string().min(1).max(70),
    description: z.string().max(160),
    ogImageId: MediaId.nullable(),
  }),
  contact: z.object({
    email: z.string().email().max(120),
    phone: z.string().max(30).nullable(),
    location: z.string().max(80).nullable(),
  }),
  socials: z
    .array(z.object({ network: SocialNetwork, url: Url }))
    .max(10),
  footerText: z.string().max(120),
});
export type Settings = z.infer<typeof Settings>;

/* ---------- Secciones ---------- */

export const SectionType = z.enum(['hero', 'biography', 'gallery', 'contact', 'text']);
export type SectionType = z.infer<typeof SectionType>;

const SectionBase = z.object({
  id: z.string().uuid(),
  anchor: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  navLabel: z.string().min(1).max(24),
  showInNav: z.boolean(),
  visible: z.boolean(),
  variant: z.enum(['plain', 'card']),
});

const Button = z.object({
  label: z.string().min(1).max(30),
  href: z.string().min(1).max(2048),
});

export const HeroProps = z.object({
  eyebrow: z.string().max(40),
  title: z.string().min(1).max(60),
  highlight: z.string().max(40),
  subtitle: z.string().max(120),
  buttons: z.array(Button).max(2),
  backgroundImageId: MediaId.nullable(),
});

export const BiographyProps = z.object({
  title: z.string().min(1).max(60),
  body: RichText,
  imageId: MediaId.nullable(),
  imageAlt: z.string().max(140),
  imageSide: z.enum(['left', 'right']),
});

export const GalleryProps = z.object({
  eyebrow: z.string().max(40),
  title: z.string().min(1).max(60),
  /** Colecciones a mostrar; vacío = todas. */
  collectionIds: z.array(MediaId).max(50),
  showTypeFilter: z.boolean(),
});

export const ContactProps = z.object({
  eyebrow: z.string().max(40),
  title: z.string().min(1).max(60),
  intro: z.string().max(300),
  showForm: z.boolean(),
});

export const TextProps = z.object({
  title: z.string().max(60),
  body: RichText,
});

export const Section = z.discriminatedUnion('type', [
  SectionBase.extend({ type: z.literal('hero'), props: HeroProps }),
  SectionBase.extend({ type: z.literal('biography'), props: BiographyProps }),
  SectionBase.extend({ type: z.literal('gallery'), props: GalleryProps }),
  SectionBase.extend({ type: z.literal('contact'), props: ContactProps }),
  SectionBase.extend({ type: z.literal('text'), props: TextProps }),
]);
export type Section = z.infer<typeof Section>;

export const Site = z
  .object({
    settings: Settings,
    sections: z.array(Section).max(30),
  })
  .superRefine((site, ctx) => {
    const seenIds = new Set<string>();
    const seenAnchors = new Set<string>();
    site.sections.forEach((s, i) => {
      if (seenIds.has(s.id)) {
        ctx.addIssue({ code: 'custom', path: ['sections', i, 'id'], message: 'id repetido' });
      }
      if (seenAnchors.has(s.anchor)) {
        ctx.addIssue({
          code: 'custom',
          path: ['sections', i, 'anchor'],
          message: 'Ya hay otra sección con ese ancla',
        });
      }
      seenIds.add(s.id);
      seenAnchors.add(s.anchor);
    });
  });
export type Site = z.infer<typeof Site>;

/* ---------- Contenido de ejemplo al crear una sección ---------- */

type PropsOf<T extends SectionType> = Extract<Section, { type: T }>['props'];

export const SECTION_DEFAULTS: { [T in SectionType]: { navLabel: string; props: PropsOf<T> } } = {
  hero: {
    navLabel: 'Inicio',
    props: {
      eyebrow: 'Artista escénica',
      title: 'Tu nombre',
      highlight: '',
      subtitle: 'Una línea que diga qué hacés',
      buttons: [],
      backgroundImageId: null,
    },
  },
  biography: {
    navLabel: 'Biografía',
    props: {
      title: 'Biografía',
      body: richTextFromPlain('Contá quién sos y qué hacés.'),
      imageId: null,
      imageAlt: '',
      imageSide: 'left',
    },
  },
  gallery: {
    navLabel: 'Material',
    props: { eyebrow: 'Portfolio', title: 'Material', collectionIds: [], showTypeFilter: true },
  },
  contact: {
    navLabel: 'Contacto',
    props: {
      eyebrow: 'Hablemos',
      title: 'Contacto',
      intro: '¿Tenés un proyecto en mente? Escribime.',
      showForm: true,
    },
  },
  text: {
    navLabel: 'Texto',
    props: { title: 'Título', body: richTextFromPlain('Escribí acá.') },
  },
};

function slugify(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'seccion'
  );
}

/** Crea una sección nueva con contenido de ejemplo y un ancla que no choque. */
export function createSection(type: SectionType, takenAnchors: Iterable<string> = []): Section {
  const taken = new Set(takenAnchors);
  const defaults = SECTION_DEFAULTS[type];
  const base = slugify(defaults.navLabel);
  let anchor = base;
  for (let n = 2; taken.has(anchor); n++) anchor = `${base}-${n}`;
  return Section.parse({
    id: globalThis.crypto.randomUUID(),
    type,
    anchor,
    navLabel: defaults.navLabel,
    // Si ya hay una sección con ese nombre, la nueva no se suma al menú
    // (evita "Biografía" dos veces); Luna la puede agregar desde el editor.
    showInNav: anchor === base,
    visible: true,
    variant: 'plain',
    props: structuredClone(defaults.props),
  });
}
