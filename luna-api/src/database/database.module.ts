import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import type { Env } from '../config/env';
import { LoginToken, LoginTokenSchema, Session, SessionSchema } from './schemas/auth.schema';
import { Media, MediaSchema } from './schemas/media.schema';
import { MediaCollection, MediaCollectionSchema } from './schemas/media-collection.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { Revision, RevisionSchema } from './schemas/revision.schema';
import { Site, SiteSchema } from './schemas/site.schema';
import { User, UserSchema } from './schemas/user.schema';

const models = MongooseModule.forFeature([
  { name: User.name, schema: UserSchema },
  { name: Site.name, schema: SiteSchema },
  { name: Revision.name, schema: RevisionSchema },
  { name: Media.name, schema: MediaSchema },
  { name: MediaCollection.name, schema: MediaCollectionSchema },
  { name: Message.name, schema: MessageSchema },
  { name: LoginToken.name, schema: LoginTokenSchema },
  { name: Session.name, schema: SessionSchema },
]);

/**
 * Conexión a Mongo + todos los modelos, global para que cada módulo
 * (Auth, Site, Media, Messages) inyecte el que necesite con @InjectModel.
 * autoIndex queda prendido: son pocas colecciones y crea los índices al arrancar.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        uri: config.get('MONGO_URI', { infer: true }),
        autoIndex: true,
        serverSelectionTimeoutMS: 5000,
      }),
    }),
    models,
  ],
  exports: [models],
})
export class DatabaseModule {}
