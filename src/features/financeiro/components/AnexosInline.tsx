import { Download, Eye } from 'lucide-react';
import type { AnexoPreviewTarget } from '@/components/AnexoPreviewDialog';
import { downloadAnexo } from '../anexoDownload';
import type { FinanceiroAnexo } from '../types';

interface Props {
  anexos: FinanceiroAnexo[];
  registroId: string;
  tipoRegistro: string;
  onPreview: (target: AnexoPreviewTarget) => void;
}

export default function AnexosInline({ anexos, registroId, tipoRegistro, onPreview }: Props) {
  const porTipo = (tipoAnexo: string) =>
    anexos.filter(
      (a) => a.registro_id === registroId && a.tipo_registro === tipoRegistro && a.tipo_anexo === tipoAnexo,
    );

  const nfs = porTipo('nota_fiscal');
  const boletos = porTipo('boleto');

  if (nfs.length === 0 && boletos.length === 0) return <span className="text-muted-foreground">—</span>;

  const chip = (a: FinanceiroAnexo) => (
    <span key={a.id} className="inline-flex items-center gap-0.5">
      <button
        onClick={(e) => { e.stopPropagation(); onPreview({ url: a.url_arquivo, nome: a.nome_arquivo, tipo: a.tipo_anexo }); }}
        className="text-primary hover:underline cursor-pointer truncate max-w-[120px]"
        title={`Visualizar ${a.nome_arquivo}`}
      >
        {a.nome_arquivo}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onPreview({ url: a.url_arquivo, nome: a.nome_arquivo, tipo: a.tipo_anexo }); }}
        className="text-muted-foreground hover:text-primary"
        title="Pré-visualizar"
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); downloadAnexo(a.url_arquivo, a.nome_arquivo); }}
        className="text-muted-foreground hover:text-primary"
        title="Baixar"
      >
        <Download className="h-3.5 w-3.5" />
      </button>
    </span>
  );

  return (
    <div className="flex flex-col gap-0.5 text-xs">
      {nfs.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-medium">📄 NF:</span>
          {nfs.map(chip)}
        </div>
      )}
      {boletos.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-medium">💳 Boleto:</span>
          {boletos.map(chip)}
        </div>
      )}
    </div>
  );
}
