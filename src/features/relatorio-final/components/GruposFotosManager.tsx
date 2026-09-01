import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FolderPlus } from 'lucide-react';
import FotosManager from './FotosManager';
import type { RelatorioFinalFoto } from '../types';

interface Props {
  fotos: RelatorioFinalFoto[];
  editable: boolean;
  uploading?: boolean;
  onUpload: (files: File[], grupo: string) => void;
  onLegenda: (id: string, legenda: string) => void;
  onMover: (id: string, direcao: -1 | 1) => void;
  onExcluir: (foto: RelatorioFinalFoto) => void;
  onRenomearGrupo: (antigoNome: string, novoNome: string) => void;
}

function TituloGrupo({
  nome,
  editable,
  total,
  onRenomear,
}: {
  nome: string;
  editable: boolean;
  total: number;
  onRenomear: (novo: string) => void;
}) {
  const [local, setLocal] = useState(nome);

  if (!editable) {
    return <span className="font-display text-base font-semibold">{nome} ({total})</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        className="max-w-xs font-display font-semibold"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const novo = local.trim();
          if (!novo) { setLocal(nome); return; }
          if (novo !== nome) onRenomear(novo);
        }}
      />
      <span className="text-sm text-muted-foreground">({total})</span>
    </div>
  );
}

export default function GruposFotosManager({
  fotos,
  editable,
  uploading,
  onUpload,
  onLegenda,
  onMover,
  onExcluir,
  onRenomearGrupo,
}: Props) {
  const [novosGrupos, setNovosGrupos] = useState<string[]>([]);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [nomeNovo, setNomeNovo] = useState('');

  const grupos = useMemo(() => {
    const doBanco = Array.from(new Set(fotos.map((f) => f.tipo))).sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    );
    const locais = novosGrupos.filter((g) => !doBanco.includes(g));
    return [...doBanco, ...locais];
  }, [fotos, novosGrupos]);

  const criarGrupo = () => {
    const nome = nomeNovo.trim();
    if (!nome) return;
    if (!grupos.includes(nome)) setNovosGrupos((g) => [...g, nome]);
    setNomeNovo('');
    setDialogAberto(false);
  };

  return (
    <div className="space-y-6">
      {editable && (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => setDialogAberto(true)}
          >
            <FolderPlus className="h-4 w-4 mr-1" /> Adicionar Ambiente
          </Button>
        </div>
      )}

      {grupos.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum ambiente cadastrado. Clique em "Adicionar Ambiente" para começar o registro fotográfico.
          </CardContent>
        </Card>
      ) : (
        grupos.map((grupo) => (
          <FotosManager
            key={grupo}
            tipo={grupo}
            titulo={
              <TituloGrupo
                nome={grupo}
                editable={editable}
                total={fotos.filter((f) => f.tipo === grupo).length}
                onRenomear={(novo) => onRenomearGrupo(grupo, novo)}
              />
            }
            fotos={fotos}
            editable={editable}
            uploading={uploading}
            onUpload={(files) => onUpload(files, grupo)}
            onLegenda={onLegenda}
            onMover={onMover}
            onExcluir={onExcluir}
          />
        ))
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo ambiente</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Ex.: Fachada Frontal"
            value={nomeNovo}
            onChange={(e) => setNomeNovo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') criarGrupo(); }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={criarGrupo}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
