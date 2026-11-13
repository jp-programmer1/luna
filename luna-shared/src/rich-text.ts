import { z } from 'zod';

/**
 * Texto con formato tal como lo guarda Tiptap (JSON), limitado a lo que Luna
 * puede usar: párrafos, negrita, cursiva, links y listas. Nunca HTML crudo.
 */

const SafeHref = z
  .string()
  .max(2048)
  .refine((v) => /^(https?:\/\/|mailto:|tel:|#)/i.test(v), {
    message: 'El link tiene que empezar con https://, mailto:, tel: o #',
  });

export const Mark = z.discriminatedUnion('type', [
  z.object({ type: z.literal('bold') }),
  z.object({ type: z.literal('italic') }),
  z.object({
    type: z.literal('link'),
    attrs: z.object({ href: SafeHref }),
  }),
]);

export const TextNode = z.object({
  type: z.literal('text'),
  text: z.string().min(1).max(10_000),
  marks: z.array(Mark).max(3).optional(),
});

export const HardBreak = z.object({ type: z.literal('hardBreak') });

export const Paragraph = z.object({
  type: z.literal('paragraph'),
  content: z.array(z.union([TextNode, HardBreak])).max(500).optional(),
});

export const ListItem = z.object({
  type: z.literal('listItem'),
  content: z.array(Paragraph).min(1).max(10),
});

export const BulletList = z.object({
  type: z.literal('bulletList'),
  content: z.array(ListItem).min(1).max(50),
});

export const OrderedList = z.object({
  type: z.literal('orderedList'),
  content: z.array(ListItem).min(1).max(50),
});

export const Block = z.discriminatedUnion('type', [Paragraph, BulletList, OrderedList]);

export const RichText = z.object({
  type: z.literal('doc'),
  content: z.array(Block).max(100),
});

export type RichText = z.infer<typeof RichText>;

/** Texto plano a RichText: cada línea en blanco separa párrafos. */
export function richTextFromPlain(text: string): RichText {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    type: 'doc',
    content: paragraphs.map((p) => ({
      type: 'paragraph' as const,
      content: [{ type: 'text' as const, text: p.replace(/\s+/g, ' ') }],
    })),
  };
}
