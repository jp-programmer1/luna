import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import type { PublicUser } from '../auth/auth.service';
import { CurrentUser, PanelOriginGuard, SessionGuard } from '../auth/guards';
import { ExpectedVersion } from './expected-version.decorator';
import { CreateSectionDto, OrderDto, PublishDto, SectionPatchDto, SettingsPatchDto } from './site.dto';
import { SectionPatch, SiteService } from './site.service';

/**
 * Todo lo que hace el panel sobre el borrador. Cada escritura manda
 * If-Match: <version> y responde el estado nuevo (borrador, versión, cambios).
 */
@ApiTags('admin · sitio')
@ApiHeader({ name: 'If-Match', description: 'Versión del borrador que tiene el panel (en escrituras)', required: false })
@Controller('admin')
@UseGuards(PanelOriginGuard, SessionGuard)
export class AdminSiteController {
  constructor(private readonly site: SiteService) {}

  @Get('site')
  state() {
    return this.site.state();
  }

  @Patch('settings')
  updateSettings(@ExpectedVersion() v: number, @Body() body: SettingsPatchDto) {
    return this.site.updateSettings(v, body);
  }

  @Post('sections')
  addSection(@ExpectedVersion() v: number, @Body() body: CreateSectionDto) {
    return this.site.addSection(v, body.type, body.after);
  }

  /** Ruta fija antes de :id para que "order" no se tome como id. */
  @Put('sections/order')
  reorder(@ExpectedVersion() v: number, @Body() body: OrderDto) {
    return this.site.reorder(v, body.ids);
  }

  @Patch('sections/:id')
  updateSection(
    @ExpectedVersion() v: number,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SectionPatchDto,
  ) {
    return this.site.updateSection(v, id, body as SectionPatch);
  }

  @Post('sections/:id/duplicate')
  duplicate(@ExpectedVersion() v: number, @Param('id', ParseUUIDPipe) id: string) {
    return this.site.duplicateSection(v, id);
  }

  @Delete('sections/:id')
  remove(@ExpectedVersion() v: number, @Param('id', ParseUUIDPipe) id: string) {
    return this.site.removeSection(v, id);
  }

  @Post('publish')
  @HttpCode(200)
  publish(@ExpectedVersion() v: number, @CurrentUser() user: PublicUser, @Body() body: PublishDto) {
    return this.site.publish(v, user.id, body.note);
  }

  @Post('discard')
  @HttpCode(200)
  discard(@ExpectedVersion() v: number) {
    return this.site.discard(v);
  }

  @Get('revisions')
  revisions() {
    return this.site.listRevisions();
  }

  @Post('revisions/:id/restore')
  @HttpCode(200)
  restore(@ExpectedVersion() v: number, @Param('id') id: string) {
    return this.site.restore(v, id);
  }

  @Post('preview-token')
  @HttpCode(200)
  previewToken() {
    return this.site.createPreviewToken();
  }
}
