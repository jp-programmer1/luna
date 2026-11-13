import { Controller, Get, Header, Param } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { SiteService } from './site.service';

/** Lo que lee el portafolio desde el servidor de Vercel. Sin login. */
@ApiTags('público')
@Controller('public')
@SkipThrottle()
export class PublicSiteController {
  constructor(private readonly site: SiteService) {}

  /** Versión publicada: ajustes, secciones visibles y fotos resueltas. */
  @Get('site')
  @Header('Cache-Control', 'public, max-age=30')
  publicSite() {
    return this.site.publicSite();
  }

  /** El borrador, para el iframe de vista previa del panel. */
  @Get('preview/:token')
  @Header('Cache-Control', 'no-store')
  @Header('X-Robots-Tag', 'noindex')
  preview(@Param('token') token: string) {
    return this.site.previewSite(token);
  }
}
