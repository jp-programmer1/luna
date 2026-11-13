import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import {
  createSection,
  diffSites,
  publicView,
  Section,
  SectionType,
  Settings,
  Site as SiteContent,
} from '@luna/shared';
import { isValidObjectId, Model, Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { signPreviewToken, verifyPreviewToken } from '../common/crypto';
import type { Env } from '../config/env';
import { Media } from '../database/schemas/media.schema';
import { Revision } from '../database/schemas/revision.schema';
import { Site, SITE_ID } from '../database/schemas/site.schema';
import { User } from '../database/schemas/user.schema';

const PREVIEW_TTL_MS = 30 * 60 * 1000;

export type SectionPatch = Partial<
  Pick<Section, 'navLabel' | 'anchor' | 'showInNav' | 'visible' | 'variant'>
> & { props?: Record<string, unknown> };

export type MediaRef = {
  kind: 'image' | 'video';
  url: string | null;
  alt: string;
  width: number | null;
  height: number | null;
  focal: { x: number; y: number };
};

@Injectable()
export class SiteService {
  private readonly logger = new Logger(SiteService.name);

  constructor(
    @InjectModel(Site.name) private readonly sites: Model<Site>,
    @InjectModel(Revision.name) private readonly revisions: Model<Revision>,
    @InjectModel(Media.name) private readonly media: Model<Media>,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /* ---------- lectura ---------- */

  private async load() {
    const site = await this.sites.findById(SITE_ID).lean();
    if (!site) throw new NotFoundException('El sitio todavía no existe: corré el seed.');
    return site;
  }

  private async publishedRevision(id: Types.ObjectId | null) {
    return id ? this.revisions.findById(id).lean() : null;
  }

  /** Lo que necesita el panel: borrador, versión y qué cambia si se publica. */
  async state() {
    const site = await this.load();
    const published = await this.publishedRevision(site.publishedRevisionId);
    return {
      draft: site.draft,
      version: site.version,
      draftUpdatedAt: site.draftUpdatedAt,
      publishedAt: published?.createdAt ?? null,
      changes: diffSites(published?.snapshot ?? null, site.draft),
    };
  }

  /* ---------- escritura del borrador ---------- */

  /**
   * Aplica un cambio sobre el borrador si el panel tenía la última versión.
   * El resultado se valida entero con el esquema Site antes de guardarse.
   */
  private async mutate(expectedVersion: number, change: (draft: SiteContent) => SiteContent) {
    const site = await this.load();
    if (site.version !== expectedVersion) throw this.conflict(site.version);

    const parsed = SiteContent.safeParse(change(structuredClone(site.draft)));
    if (!parsed.success) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'El contenido no es válido.',
        errors: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }

    const updated = await this.sites.findOneAndUpdate(
      { _id: SITE_ID, version: expectedVersion },
      { $set: { draft: parsed.data, draftUpdatedAt: new Date() }, $inc: { version: 1 } },
      { new: true },
    );
    if (!updated) throw this.conflict((await this.load()).version);
    return this.state();
  }

  private conflict(currentVersion: number) {
    return new ConflictException({
      statusCode: 409,
      message: 'Otra pestaña guardó cambios antes. Recargá para ver la última versión.',
      currentVersion,
    });
  }

  private indexOrThrow(draft: SiteContent, id: string): number {
    const i = draft.sections.findIndex((s) => s.id === id);
    if (i === -1) throw new NotFoundException('No existe esa sección.');
    return i;
  }

  updateSettings(version: number, patch: Partial<Settings>) {
    return this.mutate(version, (d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }

  addSection(version: number, type: SectionType, after?: string | null) {
    return this.mutate(version, (d) => {
      const section = createSection(type, d.sections.map((s) => s.anchor));
      const at = after ? this.indexOrThrow(d, after) + 1 : d.sections.length;
      d.sections.splice(at, 0, section);
      return d;
    });
  }

  updateSection(version: number, id: string, patch: SectionPatch) {
    return this.mutate(version, (d) => {
      const i = this.indexOrThrow(d, id);
      d.sections[i] = { ...d.sections[i], ...patch } as Section;
      return d;
    });
  }

  duplicateSection(version: number, id: string) {
    return this.mutate(version, (d) => {
      const i = this.indexOrThrow(d, id);
      const original = d.sections[i];
      const copy = {
        ...structuredClone(original),
        id: randomUUID(),
        anchor: uniqueAnchor(`${original.anchor}-copia`, d.sections),
        navLabel: `${original.navLabel} (copia)`.slice(0, 24),
      };
      d.sections.splice(i + 1, 0, copy);
      return d;
    });
  }

  removeSection(version: number, id: string) {
    return this.mutate(version, (d) => {
      d.sections.splice(this.indexOrThrow(d, id), 1);
      return d;
    });
  }

  reorder(version: number, ids: string[]) {
    return this.mutate(version, (d) => {
      const current = d.sections.map((s) => s.id);
      if (ids.length !== current.length || new Set(ids).size !== ids.length || !ids.every((id) => current.includes(id))) {
        throw new BadRequestException('El orden tiene que incluir todas las secciones, una vez cada una.');
      }
      const byId = new Map(d.sections.map((s) => [s.id, s]));
      d.sections = ids.map((id) => byId.get(id)!);
      return d;
    });
  }

  async discard(version: number) {
    const site = await this.load();
    const published = await this.publishedRevision(site.publishedRevisionId);
    if (!published) throw new BadRequestException('Todavía no hay nada publicado para volver.');
    return this.mutate(version, () => published.snapshot);
  }

  async restore(version: number, revisionId: string) {
    if (!isValidObjectId(revisionId)) throw new NotFoundException('No existe esa versión.');
    const revision = await this.revisions.findById(revisionId).lean();
    if (!revision) throw new NotFoundException('No existe esa versión.');
    return this.mutate(version, () => revision.snapshot);
  }

  /* ---------- publicación ---------- */

  async publish(expectedVersion: number, userId: string, note?: string) {
    const site = await this.load();
    if (site.version !== expectedVersion) throw this.conflict(site.version);
    const snapshot = SiteContent.parse(site.draft);

    // Sin transacción: primero la revisión, después el puntero. Si lo segundo
    // falla queda una revisión huérfana que no molesta.
    const revision = await this.revisions.create({
      snapshot,
      note: note ?? '',
      createdBy: new Types.ObjectId(userId),
    });
    await this.sites.updateOne({ _id: SITE_ID }, { $set: { publishedRevisionId: revision._id } });

    const revalidated = await this.revalidate();
    return { revisionId: revision._id.toString(), revalidated, ...(await this.state()) };
  }

  /** Pide a Vercel que regenere la home (ISR on-demand). Nunca rompe la publicación. */
  private async revalidate(): Promise<boolean> {
    const token = this.config.get('REVALIDATE_TOKEN', { infer: true });
    if (!token) return false;
    const url = this.config.get('PUBLIC_SITE_URL', { infer: true });
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'x-prerender-revalidate': token },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) this.logger.warn(`La revalidación respondió ${res.status}`);
      return res.ok;
    } catch (err) {
      this.logger.warn(`No se pudo revalidar ${url}: ${(err as Error).message}`);
      return false;
    }
  }

  async listRevisions(limit = 50) {
    const site = await this.load();
    const rows = await this.revisions
      .find({}, { snapshot: 0 })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    const authors = await this.users.find({ _id: { $in: rows.map((r) => r.createdBy) } }, { name: 1 }).lean();
    const nameOf = new Map(authors.map((u) => [u._id.toString(), u.name]));
    return rows.map((r) => ({
      id: r._id.toString(),
      note: r.note,
      createdAt: r.createdAt,
      createdBy: nameOf.get(r.createdBy.toString()) ?? null,
      live: site.publishedRevisionId?.equals(r._id) ?? false,
    }));
  }

  /* ---------- lectura pública ---------- */

  createPreviewToken() {
    return signPreviewToken(this.config.get('PREVIEW_SECRET', { infer: true }), PREVIEW_TTL_MS);
  }

  async publicSite() {
    const site = await this.load();
    const published = await this.publishedRevision(site.publishedRevisionId);
    if (!published) throw new NotFoundException('Todavía no hay nada publicado.');
    return this.withMedia(publicView(published.snapshot), published.createdAt);
  }

  async previewSite(token: string) {
    if (!verifyPreviewToken(this.config.get('PREVIEW_SECRET', { infer: true }), token)) {
      throw new NotFoundException('La vista previa venció. Abrila de nuevo desde el panel.');
    }
    const site = await this.load();
    return this.withMedia(publicView(site.draft), site.draftUpdatedAt);
  }

  /** Resuelve las fotos que usan las secciones, para que el portafolio no haga otra consulta. */
  private async withMedia(site: SiteContent, updatedAt: Date) {
    const ids = new Set<string>();
    if (site.settings.seo.ogImageId) ids.add(site.settings.seo.ogImageId);
    for (const s of site.sections) {
      for (const key of ['imageId', 'backgroundImageId'] as const) {
        const value = (s.props as Record<string, unknown>)[key];
        if (typeof value === 'string') ids.add(value);
      }
    }
    const docs = ids.size ? await this.media.find({ _id: { $in: [...ids] } }).lean() : [];
    const base = this.config.get('MEDIA_BASE_URL', { infer: true });
    const media: Record<string, MediaRef> = {};
    for (const m of docs) {
      const url =
        m.source === 'upload' && base && m.storageKey
          ? `${base.replace(/\/$/, '')}/${m.storageKey}`
          : m.source === 'youtube'
            ? m.url
            : m.source === 'drive'
              ? `/public/media/${m._id.toString()}/file`
              : null;
      media[m._id.toString()] = {
        kind: m.kind,
        url,
        alt: m.alt,
        width: m.width,
        height: m.height,
        focal: { x: m.focal?.x ?? 0.5, y: m.focal?.y ?? 0.5 },
      };
    }
    return { ...site, media, updatedAt };
  }
}

function uniqueAnchor(base: string, sections: Section[]): string {
  const taken = new Set(sections.map((s) => s.anchor));
  const clean = base.slice(0, 36);
  let anchor = clean;
  for (let n = 2; taken.has(anchor); n++) anchor = `${clean}-${n}`;
  return anchor;
}
