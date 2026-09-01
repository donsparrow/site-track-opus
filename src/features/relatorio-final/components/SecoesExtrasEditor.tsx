import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowDown, ArrowUp, FilePlus2, X } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';
import type { SecaoExtra } from '../types';

interface Props {
  secoes: SecaoExtra[];
  editable: boolean;
  onChange: (secoes: SecaoExtra[]) => void;
}

export default function SecoesExtrasEditor({ secoes, editable, onChange }: Props) {
  const ordenadas = [...secoes].sort((a, b) => a.ordem - b.ordem);

  const emitir = (lista: SecaoExtra[]) =>
    onChange(lista.map((s, i) => ({ ...s, ordem: i })));

  const adicionar = () =>
    emitir([...ordenadas, { id: crypto.randomUUID(), titulo: 'Nova Seção', conteudo: '', ordem: ordenadas.length }]);

  const atualizar = (id: string, campos: Partial<SecaoExtra>) =>
    emitir(ordenadas.map((s) => (s.id === id ? { ...s, ...campos } : s)));

  const excluir = (id: string) => {
    if (!confirm('Excluir esta seção?')) return;
    emitir(ordenadas.filter((s) => s.id !== id));
  };

  const mover = (index: number, dir: -1 | 1) => {
    const alvo = index + dir;
    if (alvo < 0 || alvo >= ordenadas.length) return;
    const lista = [...ordenadas];
    [lista[index], lista[alvo]] = [lista[alvo], lista[index]];
    emitir(lista);
  };

  return (
    <div className="space-y-6">
      {ordenadas.map((secao, i) => (
        <Card key={secao.id}>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <Input
              className="max-w-sm font-display font-semibold"
              value={secao.titulo}
              placeholder="Título da seção"
              disabled={!editable}
              onChange={(e) => atualizar(secao.id, { titulo: e.target.value })}
            />
            {editable && (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => mover(i, -1)}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" disabled={i === ordenadas.length - 1} onClick={() => mover(i, 1)}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => excluir(secao.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <RichTextEditor
              value={secao.conteudo || ''}
              editable={editable}
              onChange={(html) => atualizar(secao.id, { conteudo: html === '<p></p>' ? '' : html })}
            />
          </CardContent>
        </Card>
      ))}

      {editable && (
        <Button variant="outline" size="sm" onClick={adicionar}>
          <FilePlus2 className="h-4 w-4 mr-1" /> Adicionar Seção
        </Button>
      )}
    </div>
  );
}
