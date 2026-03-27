import { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import {
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Heading3,
  List, ListOrdered, Link as LinkIcon, Save, Palette, Highlighter
} from 'lucide-react';

interface AnotacoesObraProps {
  obraId: string;
  initialContent?: string | null;
}

const TEXT_COLORS = [
  { label: 'Preto', value: '#000000' },
  { label: 'Vermelho', value: '#e53e3e' },
  { label: 'Azul', value: '#3182ce' },
  { label: 'Verde', value: '#38a169' },
  { label: 'Laranja', value: '#dd6b20' },
  { label: 'Roxo', value: '#805ad5' },
  { label: 'Rosa', value: '#d53f8c' },
  { label: 'Cinza', value: '#718096' },
];

const HIGHLIGHT_COLORS = [
  { label: 'Amarelo', value: '#fefcbf' },
  { label: 'Verde', value: '#c6f6d5' },
  { label: 'Azul', value: '#bee3f8' },
  { label: 'Rosa', value: '#fed7e2' },
  { label: 'Laranja', value: '#feebc8' },
  { label: 'Roxo', value: '#e9d8fd' },
];

export default function AnotacoesObra({ obraId, initialContent }: AnotacoesObraProps) {
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: initialContent || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1',
      },
    },
  });

  useEffect(() => {
    if (editor && initialContent !== undefined) {
      const currentContent = editor.getHTML();
      if (currentContent !== initialContent && initialContent !== null) {
        editor.commands.setContent(initialContent || '');
      }
    }
  }, [initialContent]);

  const handleSave = useCallback(async () => {
    if (!editor) return;
    setSaving(true);
    const html = editor.getHTML();
    const content = html === '<p></p>' ? null : html;
    const { error } = await supabase
      .from('obras')
      .update({ anotacoes: content } as any)
      .eq('id', obraId);
    setSaving(false);
    if (error) toast.error('Erro ao salvar: ' + error.message);
    else toast.success('Anotações salvas!');
  }, [editor, obraId]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('URL do link:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const ToolBtn = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title: string }) => (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="sm"
      className="h-8 w-8 p-0"
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display">📝 Anotações da Obra</CardTitle>
        <Button onClick={handleSave} disabled={saving} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Save className="h-4 w-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
            <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito">
              <Bold className="h-4 w-4" />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálico">
              <Italic className="h-4 w-4" />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Sublinhado">
              <UnderlineIcon className="h-4 w-4" />
            </ToolBtn>
            <div className="w-px bg-border mx-1" />
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Título 1">
              <Heading1 className="h-4 w-4" />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título 2">
              <Heading2 className="h-4 w-4" />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Título 3">
              <Heading3 className="h-4 w-4" />
            </ToolBtn>
            <div className="w-px bg-border mx-1" />
            <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista">
              <List className="h-4 w-4" />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
              <ListOrdered className="h-4 w-4" />
            </ToolBtn>
            <div className="w-px bg-border mx-1" />
            <ToolBtn onClick={addLink} active={editor.isActive('link')} title="Link">
              <LinkIcon className="h-4 w-4" />
            </ToolBtn>
            <div className="w-px bg-border mx-1" />
            {/* Text Color */}
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" title="Cor do texto">
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <p className="text-xs font-medium mb-2 text-muted-foreground">Cor do texto</p>
                <div className="flex flex-wrap gap-1.5">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      className="w-7 h-7 rounded-md border border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                      onClick={() => editor.chain().focus().setColor(c.value).run()}
                    />
                  ))}
                </div>
                <button
                  className="text-xs text-muted-foreground mt-2 hover:underline"
                  onClick={() => editor.chain().focus().unsetColor().run()}
                >
                  Remover cor
                </button>
              </PopoverContent>
            </Popover>
            {/* Highlight */}
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" title="Marca-texto">
                  <Highlighter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <p className="text-xs font-medium mb-2 text-muted-foreground">Marca-texto</p>
                <div className="flex flex-wrap gap-1.5">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      className="w-7 h-7 rounded-md border border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                      onClick={() => editor.chain().focus().toggleHighlight({ color: c.value }).run()}
                    />
                  ))}
                </div>
                <button
                  className="text-xs text-muted-foreground mt-2 hover:underline"
                  onClick={() => editor.chain().focus().unsetHighlight().run()}
                >
                  Remover marcação
                </button>
              </PopoverContent>
            </Popover>
          </div>
          {/* Editor */}
          <EditorContent editor={editor} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">⚠️ Visível apenas para a equipe interna (admin/trabalhador)</p>
      </CardContent>
    </Card>
  );
}
