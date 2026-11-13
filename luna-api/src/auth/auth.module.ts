import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PanelOriginGuard, SessionGuard } from './guards';
import { MailService } from './mail.service';

/** Global para que /admin use SessionGuard y PanelOriginGuard sin reimportar. */
@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, MailService, SessionGuard, PanelOriginGuard],
  exports: [AuthService, SessionGuard, PanelOriginGuard],
})
export class AuthModule {}
