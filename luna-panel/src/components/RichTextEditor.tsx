import type { RichText } from '@luna/shared';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Link as LinkIcon, List, ListOrdered } from 'lucide-react';
import { cx } from './ui';

/**
 * Editor limitado a lo que el sitio sabe mostrar: párrafos, negrita, cursiva,
 * links y listas. Devuelve el JSON de Tiptap, que la API valida con RichText.
 */
export function RichTextEditor({
  id,
  value,
  onChange,
  describedBy,
}: {
  id: string;
  value: RichText;
  onChange: (doc: RichText) => void;
  describedBy?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
          protocols: ['http', 'https', 'mailto', 'tel'],
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      },
      // Al pegar desde Word o la web, solo texto con formato básico.
      transformPastedHTML: (html) => html.replace(/<(\/?)(h[1-6]|blockquote|pre)[^>]*>/gi, '<$1p>'),
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichText),
  });

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive('bold'),
            italic: e.isActive('italic'),
            link: e.isActive('link'),
            bullet: e.isActive('bulletList'),
            ordered: e.isActive('orderedList'),
          }
        : null,
  });

  if (!editor) return null;

  const toggleLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const raw = window.prompt('Pegá el link (por ejemplo, tu Instagram o una nota):');
    if (!raw?.trim()) return;
    const href = /^(https?:\/\/|mailto:|tel:)/i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  const tool = (label: string, on: boolean | undefined, onClick: () => void, children: React.ReactNode) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={!!on}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cx(
        'inline-flex size-10 cursor-pointer items-center justify-center rounded-lg',
        on ? 'bg-brand/20 text-brand-soft' : 'text-ink-2 hover:bg-line-soft',
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="rich-editor overflow-hidden rounded-[10px] border border-line-strong bg-surface-2 focus-within:border-brand">
      <div role="toolbar" aria-label="Formato del texto" className="flex gap-0.5 border-b border-line p-1">
        {tool('Negrita', active?.bold, () => editor.chain().focus().toggleBold().run(), <Bold className="size-[17px]" />)}
        {tool('Cursiva', active?.italic, () => editor.chain().focus().toggleItalic().run(), <Italic className="size-[17px]" />)}
        {tool('Link', active?.link, toggleLink, <LinkIcon className="size-[17px]" />)}
        {tool('Lista', active?.bullet, () => editor.chain().focus().toggleBulletList().run(), <List className="size-[17px]" />)}
        {tool('Lista numerada', active?.ordered, () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="size-[17px]" />)}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
