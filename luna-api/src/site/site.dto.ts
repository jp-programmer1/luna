import { Section, SectionType, Settings } from '@luna/shared';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class SettingsPatchDto extends createZodDto(Settings.partial().strict()) {}

export class CreateSectionDto extends createZodDto(
  z.object({
    type: SectionType,
    /** Id de la sección después de la cual va. null o ausente = al final. */
    after: z.string().uuid().nullable().optional(),
  }),
) {}

const SectionFields = Section.options[0].pick({
  navLabel: true,
  anchor: true,
  showInNav: true,
  visible: true,
  variant: true,
});

/** props se reemplaza entero y se valida contra el tipo de la sección al guardar. */
export class SectionPatchDto extends createZodDto(
  SectionFields.partial()
    .extend({ props: z.record(z.string(), z.unknown()).optional() })
    .strict()
    .refine((v) => Object.keys(v).length > 0, 'No hay nada para cambiar'),
) {}

export class OrderDto extends createZodDto(z.object({ ids: z.array(z.string().uuid()).min(1).max(30) })) {}

export class PublishDto extends createZodDto(z.object({ note: z.string().trim().max(140).optional() })) {}
