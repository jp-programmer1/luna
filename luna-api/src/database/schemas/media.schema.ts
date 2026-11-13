import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type MediaKind = 'image' | 'video';
export type MediaSource = 'upload' | 'drive' | 'youtube';

@Schema({ _id: false })
export class Focal {
  @Prop({ type: Number, min: 0, max: 1, default: 0.5 })
  x: number;

  @Prop({ type: Number, min: 0, max: 1, default: 0.5 })
  y: number;
}
const FocalSchema = SchemaFactory.createForClass(Focal);

/** Toda foto o video, se use en la galería o en una sección. */
@Schema({ collection: 'media', timestamps: true })
export class Media {
  @Prop({ required: true, enum: ['image', 'video'] })
  kind: MediaKind;

  @Prop({ required: true, enum: ['upload', 'drive', 'youtube'] })
  source: MediaSource;

  /** Clave en R2 (source = upload). */
  @Prop({ type: String, default: null })
  storageKey: string | null;

  /** Id del archivo en Google Drive (source = drive). */
  @Prop({ type: String, default: null })
  driveFileId: string | null;

  /** URL de YouTube/Vimeo (source = youtube). */
  @Prop({ type: String, default: null })
  url: string | null;

  @Prop({ type: String, trim: true, maxlength: 120, default: '' })
  title: string;

  @Prop({ type: String, trim: true, maxlength: 500, default: '' })
  description: string;

  @Prop({ type: String, trim: true, maxlength: 140, default: '' })
  alt: string;

  @Prop({ type: Number, default: null })
  width: number | null;

  @Prop({ type: Number, default: null })
  height: number | null;

  @Prop({ type: FocalSchema, default: () => ({ x: 0.5, y: 0.5 }) })
  focal: Focal;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'MediaCollection', default: null })
  collectionId: Types.ObjectId | null;

  @Prop({ type: Number, default: 0 })
  sort: number;

  @Prop({ type: Boolean, default: false })
  hidden: boolean;
}

export type MediaDocument = HydratedDocument<Media>;
export const MediaSchema = SchemaFactory.createForClass(Media);
MediaSchema.index({ collectionId: 1, sort: 1 });
// Un archivo de Drive se importa una sola vez.
MediaSchema.index(
  { driveFileId: 1 },
  { unique: true, partialFilterExpression: { driveFileId: { $type: 'string' } } },
);
