import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserRole = 'owner' | 'admin';

/** Luna (owner) y Emir (admin). Solo estos emails pueden pedir link de acceso. */
@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, lowercase: true, trim: true, unique: true })
  email: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: ['owner', 'admin'] })
  role: UserRole;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
