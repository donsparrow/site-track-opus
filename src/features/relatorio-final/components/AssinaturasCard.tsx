import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AssinarDialog from '@/features/relatorios/components/AssinarDialog';
import { useSignedUrls } from '../hooks/useSignedUrls';
import type { RelatorioFinal } from '../types';

interface Props {
  relatorio: RelatorioFinal;
  editable: boolean;
  saving?: boolean;
  onAssinar: (tipo: 'empresa' | 'sindico', values: { dataUrl: string; nome: string; cargo: string }) => void;
  onRemover: (tipo: 'empresa' | 'sindico') => void;
}

export default function AssinaturasCard({ relatorio, editable, saving, onAssinar, onRemover }: Props) {
  const [dialog, setDialog] = useState<'empresa' | 'sindico' | null>(null);
  const urls = useSignedUrls([relatorio.assinatura_empresa_url, relatorio.assinatura_sindico_url]);

  const blocos = [
    {
      tipo: 'empresa' as const,
      label: 'Empresa / Responsável Técnico',
      url: relatorio.assinatura_empresa_url,
      nome: relatorio.assinatura_empresa_nome,
      cargo: relatorio.assinatura_empresa_cargo,
      data: relatorio.assinatura_empresa_data,
    },
    {
      tipo: 'sindico' as const,
      label: 'Cliente / Síndico',
      url: relatorio.assinatura_sindico_url,
      nome: relatorio.assinatura_sindico_nome,
      cargo: relatorio.assinatura_sindico_cargo,
      data: relatorio.assinatura_sindico_data,
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-base">Assinaturas</CardTitle>
        <Badge variant={relatorio.status === 'assinado' ? 'default' : 'secondary'}>
          {relatorio.status === 'assinado' ? 'Assinado' : 'Não assinado'}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {blocos.map((b) => (
          <div key={b.tipo} className="border rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium">{b.label}</p>
            {b.url ? (
              <>
                {urls[b.url] ? (
                  <img src={urls[b.url]} alt={`Assinatura ${b.label}`} className="h-20 object-contain bg-white rounded border" />
                ) : (
                  <div className="h-20 bg-muted rounded" />
                )}
                <p className="text-sm">{b.nome}{b.cargo ? ` — ${b.cargo}` : ''}</p>
                {b.data && <p className="text-xs text-muted-foreground">Assinado em {new Date(`${b.data}T00:00:00`).toLocaleDateString('pt-BR')}</p>}
                {editable && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onRemover(b.tipo)}>Remover assinatura</Button>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Sem assinatura registrada.</p>
                {editable && <Button size="sm" variant="outline" onClick={() => setDialog(b.tipo)}>Assinar</Button>}
              </>
            )}
          </div>
        ))}

        <AssinarDialog
          open={dialog !== null}
          onOpenChange={(o) => !o && setDialog(null)}
          saving={saving}
          onConfirm={({ dataUrl, nome, cargo }) => {
            if (dialog) onAssinar(dialog, { dataUrl, nome, cargo });
            setDialog(null);
          }}
        />
      </CardContent>
    </Card>
  );
}
