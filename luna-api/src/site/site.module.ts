import { Module } from '@nestjs/common';
import { AdminSiteController } from './admin-site.controller';
import { PublicSiteController } from './public-site.controller';
import { SiteService } from './site.service';

@Module({
  controllers: [AdminSiteController, PublicSiteController],
  providers: [SiteService],
  exports: [SiteService],
})
export class SiteModule {}
