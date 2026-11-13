import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { Site as SiteContent } from '@luna/shared';

export const SITE_ID = 'main';

/**
 * Documento único con el borrador del sitio.
 * `draft` se valida con el esquema Site de @luna/shared antes de guardarse;
 * en Mongoose queda como Mixed para no duplicar el modelo.
 * `version` se incrementa en cada guardado: findOneAndUpdate({ _id, version })
 * devuelve null si otra pestaña guardó antes → 409.
 */
@Schema({ collection: 'site', timestamps: false, minimize: false })
export class Site {
  @Prop({ type: String, default: SITE_ID })
  _id: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  draft: SiteContent;

  @Prop({ type: Number, required: true, default: 0 })
  version: number;

  @Prop({ type: Date, required: true, default: () => new Date() })
  draftUpdatedAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Revision', default: null })
  publishedRevisionId: Types.ObjectId | null;
}

export type SiteDocument = HydratedDocument<Site>;
export const SiteSchema = SchemaFactory.createForClass(Site);
