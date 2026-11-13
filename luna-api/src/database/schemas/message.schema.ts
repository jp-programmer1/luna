import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/** Bandeja del formulario de contacto (además del mail que manda Resend). */
@Schema({ collection: 'messages', timestamps: { createdAt: true, updatedAt: false } })
export class Message {
  @Prop({ required: true, trim: true, maxlength: 100 })
  name: string;

  @Prop({ required: true, trim: true, lowercase: true, maxlength: 120 })
  email: string;

  @Prop({ required: true, trim: true, maxlength: 5000 })
  message: string;

  @Prop({ type: Date, default: null })
  readAt: Date | null;

  createdAt: Date;
}

export type MessageDocument = HydratedDocument<Message>;
export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ createdAt: -1 });
