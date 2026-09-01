import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AssinarDialog from '@/features/relatorios/components/AssinarDialog';
import { useSignedUrls } from '../hooks/useSignedUrls';
import type { RelatorioFinal, RelatorioFinalFoto } from '../types';
import { SECOES } from '../types';

interface RelatorioFinalViewerProps {
  relatorio: RelatorioFinal;
  fotos: RelatorioFinalFoto[];
  obraNome: string;
  /** Tipo do laudo exibido (usado para adaptações de layout). */
  tipoRelatorio?: string;
  onAssinar: (tipo: 'empresa' | 'sindico', values: { dataUrl: string; nome: string; cargo: string }) => void;
  assinarPending: boolean;
}

const fmt = (d: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR') : null;

function hasContent(html: string | null): boolean {
  if (!html) return false;
  return html.replace(/<[^>]*>/g, '').trim().length > 0;
}

export default function RelatorioFinalViewer({ relatorio, fotos, obraNome, onAssinar, assinarPending }: RelatorioFinalViewerProps) {
  const [dialogAberto, setDialogAberto] = useState(false);

  const preObra = fotos.filter((f) => f.tipo === 'pre_obra').sort((a, b) => a.ordem - b.ordem);
  const posObra = fotos.filter((f) => f.tipo === 'pos_obra').sort((a, b) => a.ordem - b.ordem);

  const urls = useSignedUrls([
    relatorio.template_capa_url,
    relatorio.foto_capa_url,
    relatorio.assinatura_empresa_url,
    relatorio.assinatura_sindico_url,
    ...preObra.map((f) => f.foto_url),
    ...posObra.map((f) => f.foto_url),
  ]);

  const dados: [string, string | null][] = [
    ['Cliente', relatorio.cliente_nome],
    ['CPF/CNPJ', relatorio.cliente_cpf_cnpj],
    ['Endereço', relatorio.endereco],
    ['Responsável', relatorio.responsavel],
    ['Data de início', fmt(relatorio.data_inicio)],
    ['Data de conclusão', fmt(relatorio.data_conclusao)],
    ['Data da vistoria', fmt(relatorio.data_vistoria)],
  ];

  const templateUrl = relatorio.template_capa_url ? urls[relatorio.template_capa_url] : null;
  const fotoCapaUrl = relatorio.foto_capa_url ? urls[relatorio.foto_capa_url] : null;

  const renderGaleria = (lista: RelatorioFinalFoto[], titulo: string) => {
    if (!lista.length) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">{titulo} ({lista.length})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {lista.map((f, i) => (
            <figure key={f.id} className="space-y-1">
              {urls[f.foto_url] ? (
                <img src={urls[f.foto_url]} alt={f.legenda || `Foto ${i + 1}`} className="rounded-lg w-full object-cover" />
              ) : (
                <div className="h-40 bg-muted rounded-lg" />
              )}
              <figcaption className="text-sm text-muted-foreground">
                Foto {String(i + 1).padStart(2, '0')}{f.legenda ? ` — ${f.legenda}` : ''}
              </figcaption>
            </figure>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* A) Preview da Capa */}
      {(relatorio.template_capa_url || relatorio.foto_capa_url) && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">Capa do Relatório</CardTitle>
          </CardHeader>
          <CardContent>
            {relatorio.template_capa_url && relatorio.foto_capa_url ? (
              <div className="relative h-[300px] rounded-lg overflow-hidden">
                {templateUrl && <img src={templateUrl} alt="Template da capa" className="w-full h-full object-cover" />}
                <p className="absolute top-4 left-0 right-0 text-center font-bold text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                  RELATÓRIO DE VISTORIA PÓS-OBRA
                </p>
                {fotoCapaUrl && (
                  <img
                    src={fotoCapaUrl}
                    alt="Foto de capa"
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[70%] max-w-[85%] object-contain rounded"
                  />
                )}
              </div>
            ) : fotoCapaUrl ? (
              <img src={fotoCapaUrl} alt="Foto de capa" className="rounded-lg max-h-72 object-contain" />
            ) : (
              templateUrl && <img src={templateUrl} alt="Template da capa" className="rounded-lg max-h-72 object-contain" />
            )}
          </CardContent>
        </Card>
      )}

      {/* B) Dados da Obra */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">Dados da Obra</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <p className="text-sm sm:col-span-2"><span className="font-semibold">Obra:</span> {obraNome}</p>
          {dados.filter(([, v]) => v).map(([label, valor]) => (
            <p key={label} className="text-sm"><span className="font-semibold">{label}:</span> {valor}</p>
          ))}
        </CardContent>
      </Card>

      {/* C) Seções de conteúdo */}
      {SECOES.map((s) => {
        const conteudo = relatorio[s.conteudo] as string | null;
        if (!hasContent(conteudo)) return null;
        const titulo = (relatorio[s.titulo] as string | null) || s.label;
        return (
          <Card key={s.key}>
            <CardHeader>
              <CardTitle className="font-display text-base">{titulo}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: conteudo! }} />
            </CardContent>
          </Card>
        );
      })}

      {/* D/E) Registro fotográfico */}
      {renderGaleria(preObra, 'Registro Fotográfico — Pré-Obra')}
      {renderGaleria(posObra, 'Registro Fotográfico — Pós-Obra')}

      {/* F) Link externo */}
      {relatorio.link_externo && (
        <Card>
          <CardContent className="py-4 text-sm">
            <span className="font-semibold">{relatorio.link_externo_label || 'Link de acesso'}: </span>
            <a href={relatorio.link_externo} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              {relatorio.link_externo}
            </a>
          </CardContent>
        </Card>
      )}

      {/* G) Assinaturas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-base">Assinaturas</CardTitle>
          <Badge variant={relatorio.status === 'assinado' ? 'default' : 'secondary'}>
            {relatorio.status === 'assinado' ? 'Assinado' : 'Não assinado'}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Empresa */}
          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium">Empresa / Responsável Técnico</p>
            {relatorio.assinatura_empresa_url ? (
              <>
                {urls[relatorio.assinatura_empresa_url] && (
                  <img src={urls[relatorio.assinatura_empresa_url]} alt="Assinatura da empresa" className="h-20 object-contain bg-white rounded border" />
                )}
                <p className="text-sm">{relatorio.assinatura_empresa_nome}{relatorio.assinatura_empresa_cargo ? ` — ${relatorio.assinatura_empresa_cargo}` : ''}</p>
                {relatorio.assinatura_empresa_data && <p className="text-xs text-muted-foreground">Assinado em {fmt(relatorio.assinatura_empresa_data)}</p>}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aguardando assinatura da empresa</p>
            )}
          </div>

          {/* Síndico */}
          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium">Cliente / Síndico</p>
            {relatorio.assinatura_sindico_url ? (
              <>
                {urls[relatorio.assinatura_sindico_url] && (
                  <img src={urls[relatorio.assinatura_sindico_url]} alt="Assinatura do síndico" className="h-20 object-contain bg-white rounded border" />
                )}
                <p className="text-sm">{relatorio.assinatura_sindico_nome}{relatorio.assinatura_sindico_cargo ? ` — ${relatorio.assinatura_sindico_cargo}` : ''}</p>
                {relatorio.assinatura_sindico_data && <p className="text-xs text-muted-foreground">Assinado em {fmt(relatorio.assinatura_sindico_data)}</p>}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Sem assinatura registrada.</p>
                <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setDialogAberto(true)}>
                  Assinar
                </Button>
              </>
            )}
          </div>

          <AssinarDialog
            open={dialogAberto}
            onOpenChange={setDialogAberto}
            saving={assinarPending}
            onConfirm={({ dataUrl, nome, cargo }) => {
              onAssinar('sindico', { dataUrl, nome, cargo });
              setDialogAberto(false);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
