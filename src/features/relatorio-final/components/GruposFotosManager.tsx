import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, ArrowRight, Check, Pencil, Plus, Trash2 } from 'lucide-react';
import FotosManager from './FotosManager';
import { resolverGruposFotos, type GrupoFotos } from '../lib/gruposFotos';
import { FOTOS_POR_PAGINA_VALIDAS } from '../lib/fotoQuadro';
import type { RelatorioFinal, RelatorioFinalFoto } from '../types';
interface Props {
  relatorio: RelatorioFinal; fotos: RelatorioFinalFoto[]; editable: boolean; uploading?: boolean; saving?: boolean;
  onSalvarGrupos: (grupos: GrupoFotos[]) => Promise<unknown>;
  onUpload: (files: File[], grupo: string) => void; onLegenda: (id: string, legenda: string) => void;
  onFormato: (id: string, values: { orientacao?: 'horizontal' | 'vertical'; rotacao?: number }) => void;
  onMover: (id: string, direcao: -1 | 1) => void; onExcluir: (foto: RelatorioFinalFoto) => void;
  onAlterar: (v: Partial<RelatorioFinal>) => void;
}
export default function GruposFotosManager(p: Props) {
  const [selecionado, setSelecionado] = useState('');
  const [dialog, setDialog] = useState<'novo' | 'renomear' | 'excluir' | null>(null);
  const [nome, setNome] = useState('');
  const grupos = resolverGruposFotos(p.relatorio, p.fotos);
  const ativo = grupos.find(g => g.chave === selecionado) ?? grupos[0];
  const index = grupos.findIndex(g => g.chave === ativo?.chave);
  const vazio = !p.fotos.some(f => f.tipo === ativo?.chave);
  const disabled = !p.editable || p.saving;
  const salvar = async (lista: GrupoFotos[], chave?: string) => {
    if (disabled) return;
    try { await p.onSalvarGrupos(lista); if (chave) setSelecionado(chave); setDialog(null); } catch { /* Keep the dialog for retry. */ }
  };
  const confirmar = () => {
    if (dialog === 'novo' && nome.trim()) { const chave = crypto.randomUUID(); void salvar([...grupos, { chave, titulo: nome.trim() }], chave); }
    if (dialog === 'renomear' && ativo && nome.trim()) void salvar(grupos.map(g => g.chave === ativo.chave ? { ...g, titulo: nome.trim() } : g));
    if (dialog === 'excluir' && ativo && vazio) void salvar(grupos.filter(g => g.chave !== ativo.chave));
  };
  const mover = (dir: -1 | 1) => {
    const alvo = index + dir; if (index < 0 || alvo < 0 || alvo >= grupos.length) return;
    const lista = [...grupos]; const atual = lista[index]; const vizinho = lista[alvo];
    if (!atual || !vizinho) return; lista[index] = vizinho; lista[alvo] = atual; void salvar(lista);
  };
  return <div className="space-y-4">
    {p.relatorio.fotos_por_pagina != null && <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
      <span className="label-tech mr-1">Fotos por página</span>
      {FOTOS_POR_PAGINA_VALIDAS.map(n => { const marcado = p.relatorio.fotos_por_pagina === n; return <Button key={n} size="sm" variant={marcado ? 'default' : 'outline'} aria-pressed={marcado} disabled={disabled} className="min-h-11 gap-1" onClick={() => p.onAlterar({ fotos_por_pagina: n })}>{n}{marcado && <Check className="h-4 w-4" />}</Button>; })}
    </div>}
    <div className="flex flex-wrap gap-2">{grupos.map(g => {
      const fotosGrupo = p.fotos.filter(f => f.tipo === g.chave);
      const semLegenda = fotosGrupo.filter(f => !f.legenda?.trim()).length;
      return <Button key={g.chave} variant={ativo?.chave === g.chave ? 'secondary' : 'outline'} className="h-auto min-h-11 whitespace-normal" onClick={() => setSelecionado(g.chave)}>{g.titulo} ({fotosGrupo.length}){semLegenda > 0 && <span className="text-warning"> · {semLegenda} sem legenda</span>}</Button>;
    })}{p.editable && <Button variant="outline" disabled={p.saving} onClick={() => { setNome(''); setDialog('novo'); }}><Plus />Divisão</Button>}</div>
    {ativo ? <><div className="flex flex-wrap items-center gap-2"><h3 className="mr-auto break-words font-display font-semibold">{ativo.titulo}</h3><Button variant="ghost" size="icon" className="min-h-11 min-w-11" disabled={disabled} title="Renomear divisão" aria-label="Renomear divisão" onClick={() => { setNome(ativo.titulo); setDialog('renomear'); }}><Pencil /></Button><Button variant="ghost" size="icon" className="min-h-11 min-w-11" disabled={disabled || index === 0} title="Mover para a esquerda" aria-label="Mover divisão para a esquerda" onClick={() => mover(-1)}><ArrowLeft /></Button><Button variant="ghost" size="icon" className="min-h-11 min-w-11" disabled={disabled || index === grupos.length - 1} title="Mover para a direita" aria-label="Mover divisão para a direita" onClick={() => mover(1)}><ArrowRight /></Button><Button variant="ghost" size="icon" className="min-h-11 min-w-11 text-destructive" disabled={disabled || !vazio} title={vazio ? 'Excluir divisão' : 'A divisão contém fotos'} aria-label="Excluir divisão" onClick={() => setDialog('excluir')}><Trash2 /></Button></div><FotosManager tipo={ativo.chave} titulo="Registro fotográfico" grupoLabel={ativo.titulo} fotos={p.fotos} editable={p.editable} uploading={p.uploading} onUpload={files => p.onUpload(files, ativo.chave)} onLegenda={p.onLegenda} onFormato={p.onFormato} onMover={p.onMover} onExcluir={p.onExcluir} fotosPorPagina={p.relatorio.fotos_por_pagina} /></> : <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma divisão cadastrada.</p>}
    <Dialog open={dialog !== null} onOpenChange={open => { if (!open && !p.saving) setDialog(null); }}><DialogContent><DialogHeader><DialogTitle>{dialog === 'novo' ? 'Nova divisão' : dialog === 'renomear' ? 'Renomear divisão' : 'Excluir divisão'}</DialogTitle></DialogHeader>{dialog === 'excluir' ? <p className="break-words text-sm">Excluir a divisão “{ativo?.titulo}”?</p> : <Input aria-label="Nome da divisão" autoFocus value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') confirmar(); }} />}<DialogFooter><Button variant="outline" disabled={p.saving} onClick={() => setDialog(null)}>Cancelar</Button><Button disabled={disabled || (dialog !== 'excluir' && !nome.trim())} onClick={confirmar}>{p.saving ? 'Salvando…' : dialog === 'excluir' ? 'Excluir' : 'Salvar'}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
