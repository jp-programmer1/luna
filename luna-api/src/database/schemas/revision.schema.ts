import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { Site as SiteContent } from '@luna/shared';

/**
 * Una publicación. Se inserta primero y después se apunta site.publishedRevisionId
 * a ella; si lo segundo falla queda huérfana y no molesta (sin transacción → sin replica set).
 */
@Schema({ collection: 'revisions', timestamps: { createdAt: true, updatedAt: false }, minimize: false })
export class Revision {
  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  snapshot: SiteContent;

  @Prop({ type: String, trim: true, maxlength: 140, default: '' })
  note: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  createdAt: Date;
}

export type RevisionDocument = HydratedDocument<Revision>;
export const RevisionSchema = SchemaFactory.createForClass(Revision);
RevisionSchema.index({ createdAt: -1 });
