import type { RichText } from '@luna/shared';

type Node = RichText['content'][number];
type Inline = NonNullable<Extract<Node, { type: 'paragraph' }>['content']>[number];

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const safeHref = (href: string) => (/^(https?:\/\/|mailto:|tel:|#)/i.test(href) ? href : '#');

function inline(node: Inline): string {
  if (node.type === 'hardBreak') return '<br>';
  let html = escape(node.text);
  for (const mark of node.marks ?? []) {
    if (mark.type === 'bold') html = `<strong class="text-foreground font-semibold">${html}</strong>`;
    else if (mark.type === 'italic') html = `<em>${html}</em>`;
    else if (mark.type === 'link') {
      const href = safeHref(mark.attrs.href);
      const external = /^https?:/i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
      html = `<a href="${escape(href)}"${external} class="text-primary underline underline-offset-4 hover:text-accent">${html}</a>`;
    }
  }
  return html;
}

const paragraph = (p: Extract<Node, { type: 'paragraph' }>) => `<p>${(p.content ?? []).map(inline).join('')}</p>`;

/**
 * RichText (JSON de Tiptap ya validado por la API) a HTML con lista blanca:
 * todo texto se escapa y los links solo pueden ser http(s), mailto, tel o #.
 */
export function renderRichText(doc: RichText): string {
  return doc.content
    .map((block) => {
      if (block.type === 'paragraph') return paragraph(block);
      const tag = block.type === 'bulletList' ? 'ul' : 'ol';
      const style = tag === 'ul' ? 'list-disc' : 'list-decimal';
      const items = block.content.map((li) => `<li>${li.content.map(paragraph).join('')}</li>`).join('');
      return `<${tag} class="${style} pl-6 space-y-1">${items}</${tag}>`;
    })
    .join('');
}
