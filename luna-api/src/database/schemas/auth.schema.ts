import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

/**
 * Link mágico: token aleatorio de un solo uso, guardado solo como hash (sha256).
 * El índice TTL sobre expiresAt hace que Mongo lo borre solo al vencer.
 */
@Schema({ collection: 'loginTokens', timestamps: { createdAt: true, updatedAt: false } })
export class LoginToken {
  @Prop({ required: true, unique: true })
  tokenHash: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export type LoginTokenDocument = HydratedDocument<LoginToken>;
export const LoginTokenSchema = SchemaFactory.createForClass(LoginToken);
LoginTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/** Sesión del panel. La cookie lleva el token; acá solo se guarda su hash. */
@Schema({ collection: 'sessions', timestamps: true })
export class Session {
  @Prop({ required: true, unique: true })
  tokenHash: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: String, maxlength: 300, default: '' })
  userAgent: string;
}

export type SessionDocument = HydratedDocument<Session>;
export const SessionSchema = SchemaFactory.createForClass(Session);
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SessionSchema.index({ userId: 1 });
