import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Bold, Italic, Underline as UnderlineIcon, Heading2, Heading3,
  List, ListOrdered, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Palette, Highlighter,
} from 'lucide-react';

const TEXT_COLORS = ['#000000', '#e53e3e', '#3182ce', '#38a169', '#dd6b20', '#805ad5', '#d53f8c', '#718096'];
const HIGHLIGHT_COLORS = ['#fefcbf', '#c6f6d5', '#bee3f8', '#fed7e2', '#feebc8', '#e9d8fd'];

interface Props {
  value: string | null | undefined;
  onChange: (html: string) => void;
  editable?: boolean;
  minHeight?: number;
  placeholder?: string;
}

/** Editor de texto rico reutilizável (tiptap) usado no Relatório Final. */
export default function RichTextEditor({ value, onChange, editable = true, minHeight = 160 }: Props) {
  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none p-3 focus:outline-none [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1`,
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    const incoming = value || '';
    if (incoming !== editor.getHTML()) editor.commands.setContent(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  const Btn = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title: string }) => (
    <Button type="button" variant={active ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0" onClick={onClick} title={title}>
      {children}
    </Button>
  );

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {editable && (
        <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
          <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito"><Bold className="h-4 w-4" /></Btn>
          <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálico"><Italic className="h-4 w-4" /></Btn>
          <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Sublinhado"><UnderlineIcon className="h-4 w-4" /></Btn>
          <div className="w-px bg-border mx-1" />
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título"><Heading2 className="h-4 w-4" /></Btn>
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Subtítulo"><Heading3 className="h-4 w-4" /></Btn>
          <div className="w-px bg-border mx-1" />
          <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista"><List className="h-4 w-4" /></Btn>
          <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada"><ListOrdered className="h-4 w-4" /></Btn>
          <div className="w-px bg-border mx-1" />
          <Btn
            onClick={() => {
              const url = window.prompt('URL do link:');
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
            active={editor.isActive('link')}
            title="Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Btn>
          <div className="w-px bg-border mx-1" />
          <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Alinhar à esquerda"><AlignLeft className="h-4 w-4" /></Btn>
          <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centralizar"><AlignCenter className="h-4 w-4" /></Btn>
          <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Alinhar à direita"><AlignRight className="h-4 w-4" /></Btn>
          <Btn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justificar"><AlignJustify className="h-4 w-4" /></Btn>
          <div className="w-px bg-border mx-1" />
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" title="Cor do texto">
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-4 gap-1">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    className="h-6 w-6 rounded border border-border"
                    style={{ backgroundColor: c }}
                    onClick={() => editor.chain().focus().setColor(c).run()}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" title="Cor de destaque">
                <Highlighter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-3 gap-1">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    className="h-6 w-6 rounded border border-border"
                    style={{ backgroundColor: c }}
                    onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
