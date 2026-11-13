import { useState } from 'react';
import { ChevronLeft, FileDown, List, PenLine, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AssinarDialog from '@/features/relatorios/components/AssinarDialog';
import { useSignedUrls } from '../hooks/useSignedUrls';
import type { RelatorioFinal, RelatorioFinalFoto } from '../types';
import { resolverSecoes } from '../lib/secoes';
import { statusLaudo, tipoLaudo } from '../lib/status';
import StatusLaudoBadge from './StatusLaudoBadge';
import FotoLightbox from './FotoLightbox';
import CapaPreview from './CapaPreview';
import FotoQuadro from './FotoQuadro';
import { resolverGruposFotos } from '../lib/gruposFotos';

interface Props {
  relatorio: RelatorioFinal; fotos: RelatorioFinalFoto[]; obraNome: string; tipoRelatorio?: string;
  onAssinar: (tipo: 'empresa' | 'sindico', values: { dataUrl: string; nome: string; cargo: string }) => void;
  preview?: boolean;
  assinarPending: boolean; onVoltar: () => void; onPdf: () => void; gerandoPdf: boolean;
}
const fmt = (d: string | null) => d ? new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR') : null;

export default function RelatorioFinalViewer({ relatorio: r, fotos, obraNome, tipoRelatorio = 'entrega_obra', onAssinar, assinarPending, onVoltar, onPdf, gerandoPdf, preview = false }: Props) {
  const [assinar, setAssinar] = useState(false);
  const [indiceAberto, setIndiceAberto] = useState(false);
  const [fotoIndice, setFotoIndice] = useState<number | null>(null);
  const status = statusLaudo(r);
  const tipo = tipoLaudo(tipoRelatorio);
  const vistoria = tipoRelatorio === 'vistoria_previa';
  const secoes = resolverSecoes(r).filter(s => s.conteudo.replace(/<[^>]*>/g, '').replace(/&nbsp;/g,' ').trim());
  const grupos = resolverGruposFotos(r, fotos).map(g => ({ nome: g.chave, titulo: vistoria ? g.titulo : `Registro Fotográfico — ${g.titulo}`, fotos: fotos.filter(f => f.tipo === g.chave).sort((a,b) => a.ordem - b.ordem) })).filter(g => g.fotos.length);
  const ordenadas = grupos.flatMap(g => g.fotos);
  const urls = useSignedUrls([r.template_capa_url,r.foto_capa_url,r.assinatura_empresa_url,r.assinatura_sindico_url,...ordenadas.map(f => f.foto_url)]);
  const capa = true;
  const indice = [{id:'resumo',titulo:'Resumo'},...(capa ? [{id:'capa',titulo:'Capa'}] : []),{id:'dados',titulo:'Dados da obra'},...secoes.map((s,i) => ({id:`secao-${i}`,titulo:s.titulo})),...grupos.map((g,i) => ({id:`fotos-${i}`,titulo:g.titulo})),...(r.link_externo ? [{id:'link',titulo:'Link externo'}] : []),{id:'assinaturas',titulo:'Assinaturas'}];
  const dados = [['Obra',obraNome],['Cliente',r.cliente_nome],['CPF/CNPJ',r.cliente_cpf_cnpj],['Endereço',r.endereco],['Responsável',r.responsavel],...(vistoria ? [] : [['Data de início',fmt(r.data_inicio)],['Data de conclusão',fmt(r.data_conclusao)]]),['Data da vistoria',fmt(r.data_vistoria)],['Contrato',r.contrato]];
  const renderIndice = () => <nav aria-label="Índice do laudo" className="space-y-1">{indice.map(s => <Button key={s.id} asChild variant="ghost" className="h-auto min-h-10 w-full justify-start whitespace-normal text-left"><a href={`#${s.id}`} onClick={() => setIndiceAberto(false)}>{s.titulo}</a></Button>)}</nav>;
  const secaoClass = 'scroll-mt-56 lg:scroll-mt-36 space-y-4 border-b pb-8';
  return <div>
    {preview && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-warning/30 bg-warning/10 p-3 text-sm"><p>Pré-visualização: é assim que o síndico/cliente verá este laudo.</p><Button variant="outline" onClick={onVoltar}><ChevronLeft />Voltar ao editor</Button></div>}
    <header className="sticky top-14 z-20 -mx-4 mb-6 border-b bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:top-0 lg:-mx-8 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1"><Button variant="link" className="h-auto p-0" onClick={onVoltar}><ChevronLeft />{preview ? 'Editor' : 'Laudos'}</Button><h1 className="font-display text-xl font-semibold">{tipo}</h1><p className="break-words text-sm text-muted-foreground">{obraNome}</p></div>
        <div className="flex flex-wrap items-center gap-2"><StatusLaudoBadge status={status} externo /><Button className="lg:hidden" variant="outline" onClick={() => setIndiceAberto(true)}><List />Índice</Button><Button variant="outline" disabled={gerandoPdf} onClick={onPdf}><FileDown />{gerandoPdf ? 'Gerando...' : 'PDF'}</Button>{!preview && status === 'aguardando' && <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setAssinar(true)}><PenLine />Assinar</Button>}</div>
      </div>
    </header>
    <div className="grid items-start gap-8 lg:grid-cols-[220px_minmax(0,900px)]">
      <aside className="sticky top-40 hidden max-h-[70vh] overflow-auto lg:block"><p className="label-tech mb-3">Índice</p>{renderIndice()}</aside>
      <div className="min-w-0 space-y-8">
        <section id="resumo" className={secaoClass}><h2 className="font-display text-lg font-semibold">Resumo</h2>
          {status !== 'rascunho' && <div className={`space-y-2 rounded-md border p-4 ${status === 'aguardando' ? 'border-warning/30 bg-warning/10' : 'border-success/30 bg-success/10'}`}><h3 className="flex items-center gap-2 font-semibold">{status === 'aguardando' ? <PenLine className="h-4 w-4 text-warning" /> : <CheckCircle className="h-4 w-4 text-success" />}{status === 'aguardando' ? 'O que você precisa fazer' : 'Laudo assinado pelas duas partes'}</h3><p className="text-sm">{status === 'aguardando' ? 'Ler o laudo e assinar para confirmar o recebimento.' : 'Você pode baixar o PDF a qualquer momento.'}</p>{!preview && status === 'aguardando' && <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setAssinar(true)}><PenLine />Assinar laudo</Button>}</div>}
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[['Data',fmt(vistoria ? r.data_vistoria : r.data_conclusao) || '—'],['Responsável',r.responsavel || '—'],['Seções com texto',secoes.length],['Fotos',ordenadas.length]].map(([label,value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-semibold">{value}</dd></div>)}</dl>
        </section>
        {capa && <section id="capa" className={secaoClass}><h2 className="font-display text-lg font-semibold">Capa</h2><div className="mx-auto w-full max-w-[300px]"><CapaPreview values={r} obraNome={obraNome} /></div></section>}
        <section id="dados" className={secaoClass}><h2 className="font-display text-lg font-semibold">Dados da obra</h2><dl className="grid gap-4 sm:grid-cols-2">{dados.filter(([,v]) => v).map(([label,v]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words text-sm">{v}</dd></div>)}</dl></section>
        {secoes.map((s,i) => <section key={s.id} id={`secao-${i}`} className={secaoClass}><h2 className="font-display text-lg font-semibold">{s.titulo}</h2><div className="prose prose-sm max-w-none break-words dark:prose-invert" dangerouslySetInnerHTML={{__html:s.conteudo}} /></section>)}
        {grupos.map((g,i) => <section key={g.nome} id={`fotos-${i}`} className={secaoClass}><h2 className="font-display text-lg font-semibold">{g.titulo} ({g.fotos.length})</h2><div className="grid gap-4 sm:grid-cols-2">{g.fotos.map(f => <figure key={f.id} className="min-w-0 space-y-2"><Button variant="ghost" className="h-auto w-full overflow-hidden p-0" aria-label={`Ampliar foto ${ordenadas.indexOf(f)+1}`} onClick={() => setFotoIndice(ordenadas.indexOf(f))}><FotoQuadro src={urls[f.foto_url]} alt={f.legenda || 'Registro fotográfico'} orientacao={f.orientacao} rotacao={f.rotacao} modo={r.fotos_por_pagina != null ? 'inteira' : undefined} /></Button><figcaption className="break-words text-sm text-muted-foreground">Foto {ordenadas.indexOf(f)+1}{f.legenda ? ` — ${f.legenda}` : ''}</figcaption></figure>)}</div></section>)}
        {r.link_externo && <section id="link" className={secaoClass}><h2 className="font-display text-lg font-semibold">{r.link_externo_label || 'Link de acesso'}</h2><a href={r.link_externo} target="_blank" rel="noopener noreferrer" className="block break-all text-primary underline">{r.link_externo}</a></section>}
        <section id="assinaturas" className={secaoClass}><h2 className="font-display text-lg font-semibold">Assinaturas</h2><div className="grid gap-6 sm:grid-cols-2">{(['empresa','sindico'] as const).map(t => {
          const path = t === 'empresa' ? r.assinatura_empresa_url : r.assinatura_sindico_url;
          const nome = t === 'empresa' ? r.assinatura_empresa_nome : r.assinatura_sindico_nome;
          const cargo = t === 'empresa' ? r.assinatura_empresa_cargo : r.assinatura_sindico_cargo;
          const data = t === 'empresa' ? r.assinatura_empresa_data : r.assinatura_sindico_data;
          return <div key={t} className="min-w-0 space-y-2"><h3 className="text-sm font-medium">{t === 'empresa' ? 'Empresa / Responsável Técnico' : 'Cliente / Síndico'}</h3>{path ? <>{urls[path] && <img src={urls[path]} alt={`Assinatura ${t === 'empresa' ? 'da empresa' : 'do cliente'}`} className="h-20 max-w-full object-contain" loading="lazy" decoding="async" />}<p className="break-words text-sm">{nome}{cargo ? ` — ${cargo}` : ''}</p>{data && <p className="text-xs text-muted-foreground">Assinado em {fmt(data)}</p>}</> : <><p className="text-sm text-muted-foreground">Sem assinatura registrada.</p>{!preview && t === 'sindico' && status === 'aguardando' && <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setAssinar(true)}>Assinar</Button>}</>}</div>;
        })}</div></section>
      </div>
    </div>
    <Dialog open={indiceAberto} onOpenChange={setIndiceAberto}><DialogContent><DialogHeader><DialogTitle>Índice</DialogTitle></DialogHeader><div className="max-h-[65vh] overflow-auto">{renderIndice()}</div></DialogContent></Dialog>
    <FotoLightbox fotos={ordenadas} urls={urls} indice={fotoIndice} onIndice={setFotoIndice} />
    <AssinarDialog open={!preview && assinar} onOpenChange={setAssinar} tipoFixo="cliente" confirmacaoLeitura="Li o laudo completo e confirmo o recebimento do documento e das condições nele registradas." subtitulo={`${tipo} — ${obraNome}`} saving={assinarPending} onConfirm={({dataUrl,nome,cargo}) => {onAssinar('sindico',{dataUrl,nome,cargo});setAssinar(false);}} />
  </div>;
}
