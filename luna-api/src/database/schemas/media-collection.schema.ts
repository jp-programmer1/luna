import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

/** Categorías de la galería (hoy son las carpetas de Drive). */
@Schema({ collection: 'collections', timestamps: true })
export class MediaCollection {
  @Prop({ required: true, trim: true, maxlength: 60 })
  name: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'MediaCollection', default: null })
  parentId: Types.ObjectId | null;

  @Prop({ type: Number, default: 0 })
  sort: number;

  /** Carpeta de Drive de la que se trae material con "Traer de Drive". */
  @Prop({ type: String, default: null })
  driveFolderId: string | null;
}

export type MediaCollectionDocument = HydratedDocument<MediaCollection>;
export const MediaCollectionSchema = SchemaFactory.createForClass(MediaCollection);
MediaCollectionSchema.index({ parentId: 1, sort: 1 });
