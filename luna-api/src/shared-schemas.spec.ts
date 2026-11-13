import { createSection, richTextFromPlain, RichText, Site } from '@luna/shared';
import { validateEnv } from './config/env';

const settings = {
  name: 'Luna Kuyen',
  seo: { title: 'Luna Kuyen | Artista Escénica', description: 'Teatro, danza y performance', ogImageId: null },
  contact: { email: 'luna@example.com', phone: null, location: 'Mendoza, Argentina' },
  socials: [{ network: 'instagram', url: 'https://www.instagram.com/lunakuyenn' }],
  footerText: '© Luna Kuyen',
};

describe('esquemas de @luna/shared', () => {
  it('crea secciones válidas con anclas que no chocan', () => {
    const a = createSection('biography');
    const b = createSection('biography', [a.anchor]);
    expect(a.anchor).toBe('biografia');
    expect(b.anchor).toBe('biografia-2');
    expect(Site.safeParse({ settings, sections: [a, b] }).success).toBe(true);
  });

  it('rechaza dos secciones con el mismo ancla', () => {
    const a = createSection('text');
    const b = { ...createSection('text'), anchor: a.anchor };
    expect(Site.safeParse({ settings, sections: [a, b] }).success).toBe(false);
  });

  it('el texto con formato no acepta links javascript:', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'hola', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }],
        },
      ],
    };
    expect(RichText.safeParse(doc).success).toBe(false);
  });

  it('convierte texto plano en párrafos', () => {
    expect(richTextFromPlain('uno\n\ndos').content).toHaveLength(2);
  });
});

describe('validateEnv', () => {
  const ok = {
    MONGO_URI: 'mongodb://localhost:27017/luna',
    PANEL_ORIGIN: 'http://localhost:5173',
    PUBLIC_SITE_URL: 'http://localhost:4321',
  };

  it('acepta un .env completo y aplica defaults', () => {
    expect(validateEnv(ok)).toMatchObject({ PORT: 3000, NODE_ENV: 'development' });
  });

  it('corta si falta MONGO_URI', () => {
    expect(() => validateEnv({ ...ok, MONGO_URI: undefined })).toThrow(/MONGO_URI/);
  });
});
