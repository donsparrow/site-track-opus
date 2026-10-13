import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, FilePlus2, Plus, X } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';
import type { SecaoExtra } from '../types';

interface Props {
  secoes: SecaoExtra[];
  editable: boolean;
  onChange: (secoes: SecaoExtra[]) => void;
}

const textoPuro = (html: string | null | undefined) =>
  (html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export default function SecoesEditor({ secoes, editable, onChange }: Props) {
  const [recolhidos, setRecolhidos] = useState<Set<string>>(new Set());
  const [paraExcluir, setParaExcluir] = useState<SecaoExtra | null>(null);
  const lista = [...secoes].sort((a, b) => a.ordem - b.ordem);

  const emitir = (nova: SecaoExtra[]) => onChange(nova.map((s, i) => ({ ...s, ordem: i })));

  const inserir = (index: number) => {
    const nova = [...lista];
    nova.splice(index, 0, { id: crypto.randomUUID(), titulo: 'Novo bloco', conteudo: '', ordem: index });
    emitir(nova);
  };

  const atualizar = (id: string, campos: Partial<SecaoExtra>) =>
    emitir(lista.map((s) => (s.id === id ? { ...s, ...campos } : s)));

  const remover = (id: string) => emitir(lista.filter((s) => s.id !== id));

  const pedirExclusao = (s: SecaoExtra) => {
    if (textoPuro(s.conteudo)) setParaExcluir(s);
    else remover(s.id);
  };

  const mover = (index: number, dir: -1 | 1) => {
    const alvo = index + dir;
    if (alvo < 0 || alvo >= lista.length) return;
    const nova = [...lista];
    [nova[index], nova[alvo]] = [nova[alvo], nova[index]];
    emitir(nova);
  };

  const alternar = (id: string) =>
    setRecolhidos((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  if (!lista.length) {
    return (
      <Card>
        <CardContent className="py-8 flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <p>Nenhum bloco. Adicione o primeiro.</p>
          {editable && (
            <Button variant="outline" size="sm" onClick={() => inserir(0)}>
              <FilePlus2 className="h-4 w-4 mr-1" /> Adicionar bloco
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {lista.map((s, i) => {
        const recolhido = recolhidos.has(s.id);
        const resumo = textoPuro(s.conteudo);
        return (
          <div key={s.id} className="space-y-2">
            {editable && i > 0 && (
              <div className="flex justify-center">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => inserir(i)}>
                  <Plus className="h-3 w-3 mr-1" /> Inserir bloco aqui
                </Button>
              </div>
            )}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <Input
                  className="max-w-sm font-display font-semibold"
                  value={s.titulo}
                  placeholder="Título do bloco"
                  disabled={!editable}
                  onChange={(e) => atualizar(s.id, { titulo: e.target.value })}
                />
                {editable && (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir">
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" disabled={i === lista.length - 1} onClick={() => mover(i, 1)} aria-label="Descer">
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => alternar(s.id)} aria-label={recolhido ? 'Expandir' : 'Recolher'}>
                      {recolhido ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => pedirExclusao(s)} aria-label="Excluir">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {recolhido ? (
                  <p className="text-sm text-muted-foreground">
                    {resumo ? (resumo.length > 80 ? `${resumo.slice(0, 80)}…` : resumo) : 'Sem texto'}
                  </p>
                ) : (
                  <RichTextEditor
                    value={s.conteudo || ''}
                    editable={editable}
                    onChange={(html) => atualizar(s.id, { conteudo: html === '<p></p>' ? '' : html })}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}

      {editable && (
        <Button variant="outline" size="sm" className="mt-2" onClick={() => inserir(lista.length)}>
          <FilePlus2 className="h-4 w-4 mr-1" /> Adicionar bloco
        </Button>
      )}

      <AlertDialog open={!!paraExcluir} onOpenChange={(o) => !o && setParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir bloco</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir o bloco '{paraExcluir?.titulo}'? O texto será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (paraExcluir) remover(paraExcluir.id); setParaExcluir(null); }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
