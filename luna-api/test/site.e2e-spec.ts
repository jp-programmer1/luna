import type { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { Section } from '@luna/shared';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Model } from 'mongoose';
import request from 'supertest';
import { MailService } from '../src/auth/mail.service';
import { Revision } from '../src/database/schemas/revision.schema';
import { Site, SITE_ID } from '../src/database/schemas/site.schema';
import { User } from '../src/database/schemas/user.schema';
import { currentPortfolioContent } from '../src/scripts/seed-content';
import { configureApp } from '../src/setup';

const PANEL = 'http://localhost:5173';

describe('Fase 1: login, borrador y publicación', () => {
  let mongo: MongoMemoryServer;
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  const links: string[] = [];
  let cookie = '';
  let version = 0;

  // Atajos: todo lo que manda el panel lleva Origin y la cookie.
  const get = (url: string) => http.get(url).set('Cookie', cookie);
  const send = (method: 'post' | 'patch' | 'put' | 'delete', url: string, body?: object, v: number | null = version) => {
    const req = http[method](url).set('Origin', PANEL).set('Cookie', cookie);
    if (v !== null) req.set('If-Match', String(v));
    return body ? req.send(body) : req;
  };
  const sections = async (): Promise<Section[]> => (await get('/admin/site')).body.draft.sections;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    Object.assign(process.env, {
      NODE_ENV: 'test',
      MONGO_URI: mongo.getUri('luna'),
      PANEL_ORIGIN: PANEL,
      PUBLIC_SITE_URL: 'http://localhost:4321',
      PREVIEW_SECRET: 'x'.repeat(40),
    });
    // ConfigModule valida el entorno al importarse: AppModule se carga después de setear las variables.
    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue({ sendMagicLink: async (_to: unknown, link: string) => void links.push(link) })
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    http = request(app.getHttpServer());

    // Usuario + seed con el contenido actual del portafolio, publicado.
    const user = await app.get<Model<User>>(getModelToken(User.name)).create({
      email: 'luna@example.com',
      name: 'Luna Kuyen',
      role: 'owner',
    });
    const draft = currentPortfolioContent();
    const rev = await app.get<Model<Revision>>(getModelToken(Revision.name)).create({
      snapshot: draft,
      note: 'Contenido inicial',
      createdBy: user._id,
    });
    await app.get<Model<Site>>(getModelToken(Site.name)).create({
      _id: SITE_ID,
      draft,
      version: 1,
      publishedRevisionId: rev._id,
    });
  });

  afterAll(async () => {
    await app?.close();
    await mongo?.stop();
  });

  describe('login', () => {
    it('rechaza pedidos que no vienen del panel', async () => {
      await http.post('/auth/magic-link').send({ email: 'luna@example.com' }).expect(403);
    });

    it('responde igual para un email desconocido y no manda nada', async () => {
      await http.post('/auth/magic-link').set('Origin', PANEL).send({ email: 'nadie@example.com' }).expect(204);
      expect(links).toHaveLength(0);
    });

    it('manda el link y lo canjea por una cookie de sesión, una sola vez', async () => {
      await http.post('/auth/magic-link').set('Origin', PANEL).send({ email: 'LUNA@example.com' }).expect(204);
      expect(links).toHaveLength(1);
      const token = new URL(links[0]).searchParams.get('token')!;
      expect(links[0].startsWith(`${PANEL}/entrar?token=`)).toBe(true);

      const res = await http.post('/auth/verify').set('Origin', PANEL).send({ token }).expect(201);
      expect(res.body.user).toMatchObject({ email: 'luna@example.com', role: 'owner' });
      const setCookie = String(res.headers['set-cookie']);
      expect(setCookie).toMatch(/luna_session=/);
      expect(setCookie).toMatch(/HttpOnly/);
      expect(setCookie).toMatch(/SameSite=Lax/);
      cookie = setCookie.split(';')[0];

      await http.post('/auth/verify').set('Origin', PANEL).send({ token }).expect(401);
    });

    it('sin cookie no entra a /admin', async () => {
      await http.get('/admin/site').expect(401);
    });

    it('/auth/me devuelve quién está logueada', async () => {
      const res = await get('/auth/me').expect(200);
      expect(res.body.user.name).toBe('Luna Kuyen');
    });
  });

  describe('borrador', () => {
    it('arranca igual a lo publicado', async () => {
      const res = await get('/admin/site').expect(200);
      version = res.body.version;
      expect(res.body.draft.sections.map((s: Section) => s.anchor)).toEqual(['inicio', 'biografia', 'material', 'contacto']);
      expect(res.body.changes).toEqual([]);
    });

    it('exige If-Match en las escrituras', async () => {
      await send('post', '/admin/sections', { type: 'text' }, null).expect(428);
    });

    it('agrega una sección después de otra y sube la versión', async () => {
      const bio = (await sections())[1];
      const res = await send('post', '/admin/sections', { type: 'text', after: bio.id }).expect(201);
      expect(res.body.version).toBe(version + 1);
      expect(res.body.draft.sections[2]).toMatchObject({ type: 'text', anchor: 'texto' });
      expect(res.body.changes).toEqual([{ kind: 'added', sectionId: res.body.draft.sections[2].id, label: 'Título' }]);
      version = res.body.version;
    });

    it('si otra pestaña guardó antes, responde 409 con la versión actual', async () => {
      const res = await send('post', '/admin/sections', { type: 'text' }, version - 1).expect(409);
      expect(res.body.currentVersion).toBe(version);
    });

    it('valida el contenido contra el tipo de la sección', async () => {
      const bio = (await sections())[1];
      await send('patch', `/admin/sections/${bio.id}`, { props: { ...bio.props, title: '' } }).expect(400);
      const evil = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }],
      };
      await send('patch', `/admin/sections/${bio.id}`, { props: { ...bio.props, body: evil } }).expect(400);
    });

    it('oculta, edita, reordena y duplica', async () => {
      let list = await sections();
      const bio = list[1];
      let res = await send('patch', `/admin/sections/${bio.id}`, { visible: false }).expect(200);
      version = res.body.version;
      res = await send('patch', `/admin/sections/${bio.id}`, { props: { ...bio.props, imageSide: 'right' } }).expect(200);
      version = res.body.version;
      expect(res.body.changes.map((c: { kind: string }) => c.kind)).toEqual(expect.arrayContaining(['hidden', 'edited']));

      list = res.body.draft.sections;
      res = await send('put', '/admin/sections/order', { ids: [...list].reverse().map((s) => s.id) }).expect(200);
      version = res.body.version;
      expect(res.body.changes.map((c: { kind: string }) => c.kind)).toContain('reordered');

      await send('put', '/admin/sections/order', { ids: list.slice(1).map((s) => s.id) }).expect(400);

      res = await send('post', `/admin/sections/${bio.id}/duplicate`).expect(201);
      version = res.body.version;
      expect(res.body.draft.sections.some((s: Section) => s.anchor === 'biografia-copia')).toBe(true);
    });

    it('borra una sección', async () => {
      const copy = (await sections()).find((s) => s.anchor === 'biografia-copia')!;
      const res = await send('delete', `/admin/sections/${copy.id}`).expect(200);
      version = res.body.version;
      expect(res.body.draft.sections).toHaveLength(5);
    });

    it('edita ajustes sin tocar el resto', async () => {
      const res = await send('patch', '/admin/settings', { footerText: 'Luna Kuyen 2026' }).expect(200);
      version = res.body.version;
      expect(res.body.draft.settings.contact.email).toBe('lunakuyenjofre@gmail.com');
      expect(res.body.changes.map((c: { kind: string }) => c.kind)).toContain('settings');
    });
  });

  describe('publicación', () => {
    it('lo publicado no cambia hasta publicar', async () => {
      const res = await http.get('/public/site').expect(200);
      expect(res.body.sections.map((s: Section) => s.anchor)).toEqual(['inicio', 'biografia', 'material', 'contacto']);
    });

    it('la vista previa muestra el borrador con un token válido', async () => {
      const { body } = await send('post', '/admin/preview-token', undefined, null).expect(200);
      const res = await http.get(`/public/preview/${body.token}`).expect(200);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.body.sections.find((s: Section) => s.anchor === 'biografia')).toBeUndefined();
      await http.get('/public/preview/123.firma-falsa').expect(404);
    });

    it('publica: el público ve el borrador sin las secciones ocultas', async () => {
      const res = await send('post', '/admin/publish', { note: 'Bio nueva' }).expect(200);
      expect(res.body.changes).toEqual([]);
      expect(res.body.revalidated).toBe(false); // sin REVALIDATE_TOKEN en tests
      const pub = await http.get('/public/site').expect(200);
      expect(pub.body.sections.map((s: Section) => s.anchor)).not.toContain('biografia');
      expect(pub.body.settings.footerText).toBe('Luna Kuyen 2026');
      expect(pub.body.media).toEqual({});
    });

    it('lista el historial con la versión en línea marcada', async () => {
      const res = await get('/admin/revisions').expect(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({ note: 'Bio nueva', live: true, createdBy: 'Luna Kuyen' });
      expect(res.body[1]).toMatchObject({ note: 'Contenido inicial', live: false });
    });

    it('restaurar carga una versión vieja como borrador, sin publicarla', async () => {
      const [, initial] = (await get('/admin/revisions')).body;
      const res = await send('post', `/admin/revisions/${initial.id}/restore`).expect(200);
      version = res.body.version;
      expect(res.body.draft.sections.map((s: Section) => s.anchor)).toEqual(['inicio', 'biografia', 'material', 'contacto']);
      expect(res.body.changes.length).toBeGreaterThan(0);
      const pub = await http.get('/public/site').expect(200);
      expect(pub.body.sections.map((s: Section) => s.anchor)).not.toContain('biografia');
    });

    it('descartar deja el borrador igual a lo publicado', async () => {
      const res = await send('post', '/admin/discard').expect(200);
      version = res.body.version;
      expect(res.body.changes).toEqual([]);
    });
  });

  describe('salida', () => {
    it('logout invalida la sesión', async () => {
      await send('post', '/auth/logout', undefined, null).expect(204);
      await get('/auth/me').expect(401);
    });
  });
});
