import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { CheckCircle2, Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RelatorioFinal, RelatorioFinalFoto } from '../types';
import { checklistLaudo } from '../lib/checklist';
import { resolverSecoes } from '../lib/secoes';
import type { useRelatorioFinalMutations } from '../hooks/useRelatorioFinalMutations';
import DadosCapaEtapa from './DadosCapaEtapa';
import SecoesEditor from './SecoesEditor';
import GruposFotosManager from './GruposFotosManager';
import AssinaturasCard from './AssinaturasCard';
interface Props { form: RelatorioFinal; fotos: RelatorioFinalFoto[]; obraNome: string; editable: boolean; alterar: (v: Partial<RelatorioFinal>, agendar?: boolean) => void; flush: () => Promise<unknown>; mutations: ReturnType<typeof useRelatorioFinalMutations>; moverFoto: (id: string, dir: -1 | 1) => void }
const nomes = ['Dados e capa', 'Conteúdo', 'Fotos', 'Revisão e assinatura'];
export default function LaudoEditorEtapas({ form, fotos, obraNome, editable, alterar, flush, mutations: m, moverFoto }: Props) {
  const [params, setParams] = useSearchParams();
  const secoes = resolverSecoes(form);
  const checklist = checklistLaudo(form, fotos, secoes);
  const parametro = Number(params.get('etapa'));
  const etapa = parametro >= 1 && parametro <= 4 && Number.isInteger(parametro) ? parametro : form.assinatura_empresa_url ? 4 : checklist.find(i => !i.ok)?.etapa || 1;
  useEffect(() => {
    if (parametro >= 1 && parametro <= 4 && Number.isInteger(parametro)) return;
    const p = new URLSearchParams(params); p.set('etapa', String(etapa)); setParams(p, { replace: true });
  }, [parametro, etapa, params, setParams]);
  const pendencias = checklist.filter(i => !i.ok && i.chave !== 'f');
  const ir = async (n: number) => { try { await flush(); const p = new URLSearchParams(params); p.set('etapa', String(n)); setParams(p); } catch { /* Keep edits available for retry. */ } };
  const percentual = Math.round(checklist.filter(i => i.ok).length / checklist.length * 100);
  return <div className="min-w-0 space-y-5">
    <div className="overflow-x-auto pb-2"><nav aria-label="Etapas do laudo" className="grid min-w-[660px] grid-cols-4 gap-2 lg:min-w-0">{nomes.map((nome, i) => { const n = checklist.filter(c => c.etapa === i + 1 && !c.ok).length; return <Button key={nome} variant="outline" onClick={() => void ir(i + 1)} aria-current={etapa === i + 1 ? 'step' : undefined} className={`h-auto min-h-20 flex-col items-start whitespace-normal gap-1 text-left ${etapa === i + 1 ? 'border-primary bg-primary/5' : ''}`}><span className="flex gap-2 items-center">{!n ? <CheckCircle2 className="h-4 w-4 text-success" /> : <span>{i + 1}</span>}{nome}</span><span className="text-xs text-muted-foreground">{n ? `${n} pendência(s)` : 'Completo'}</span></Button>; })}</nav></div>
    {form.status === 'assinado' && <p className="text-sm text-muted-foreground" role="status">Laudo assinado pelas duas partes. Conteúdo e assinaturas bloqueados para edição.</p>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
      <div className="min-w-0 space-y-5">
        {etapa === 1 && <DadosCapaEtapa form={form} obraNome={obraNome} editable={editable} alterar={alterar} flush={flush} uploadingCapa={m.uploadCapa.isPending} uploadingTemplate={m.uploadTemplateCapa.isPending} onUploadCapa={f => m.uploadCapa.mutate(f)} onUploadTemplate={f => m.uploadTemplateCapa.mutate(f)} onRemoverTemplate={() => m.removerTemplateCapa.mutate(form.template_capa_url)} />}
        {etapa === 2 && <SecoesEditor secoes={secoes} editable={editable} onChange={s => alterar({ secoes: s as unknown as RelatorioFinal['secoes'] })} />}
        {etapa === 3 && <GruposFotosManager relatorio={form} saving={m.salvarGruposFotos.isPending} onSalvarGrupos={m.salvarGruposFotos.mutateAsync} onFormato={(id, values) => m.atualizarFoto.mutate({ id, ...values })} fotos={fotos} editable={editable} uploading={m.adicionarFotos.isPending} onUpload={(files, grupo) => m.adicionarFotos.mutate({ files, tipo: grupo, ordemInicial: fotos.filter(f => f.tipo === grupo).length })} onLegenda={(id, legenda) => m.atualizarFoto.mutate({ id, legenda })} onMover={moverFoto} onExcluir={f => m.excluirFoto.mutate({ id: f.id, fotoUrl: f.foto_url })} onAlterar={alterar} />}
        {etapa === 4 && <><Card><CardHeader><CardTitle className="text-base">Revisão</CardTitle></CardHeader><CardContent>{pendencias.length ? <div className="space-y-2">{pendencias.map(p => <Button key={p.chave} variant="ghost" className="h-auto min-h-11 w-full justify-start whitespace-normal text-left" onClick={() => void ir(p.etapa)}><Circle className="shrink-0 text-warning" />{p.texto}</Button>)}</div> : <p className="rounded border border-success/30 bg-success/10 p-3 text-sm text-success">Tudo pronto. Use “Ver como cliente” para conferir o resultado final.</p>}</CardContent></Card><AssinaturasCard relatorio={form} editable={editable} saving={m.assinar.isPending} pendencias={pendencias} onAssinar={(tipo, values) => { void flush().then(() => m.assinar.mutate({ tipo, ...values })).catch(() => {}); }} onRemover={tipo => m.removerAssinatura.mutate(tipo)} /></>}
        <footer className="flex flex-wrap justify-between gap-2 border-t pt-4"><Button variant="outline" disabled={etapa === 1} onClick={() => void ir(etapa - 1)}><ChevronLeft />Anterior</Button><Button variant="outline" className="h-auto min-h-11 whitespace-normal" disabled={etapa === 4} onClick={() => void ir(etapa + 1)}>Próximo: {nomes[Math.min(etapa, 3)]}<ChevronRight /></Button></footer>
      </div>
      <aside className="space-y-4 rounded-md border p-4 lg:sticky lg:top-6"><h2 className="font-display font-semibold">Checklist do laudo</h2><p className="data-tech text-2xl">{percentual}%</p><div role="progressbar" aria-valuenow={percentual} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-warning" style={{ width: `${percentual}%` }} /></div><div className="space-y-1">{checklist.map(p => <Button key={p.chave} variant="ghost" className="h-auto min-h-11 w-full justify-start whitespace-normal px-0 text-left text-xs" onClick={() => void ir(p.etapa)}>{p.ok ? <CheckCircle2 className="shrink-0 text-success" /> : <Circle className="shrink-0 text-warning" />}{p.texto}</Button>)}</div><p className="text-xs text-muted-foreground">Clique num item para ir até a etapa.</p></aside>
    </div>
  </div>;
}