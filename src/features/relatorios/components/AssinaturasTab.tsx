import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Assinatura } from '../types';

interface Props {
  assinaturas: Assinatura[];
  assinaturaUrls: Record<string, string>;
}

export default function AssinaturasTab({ assinaturas, assinaturaUrls }: Props) {
  return (
    <Card>
      <CardContent className="pt-6">
        {assinaturas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma assinatura registrada</p>
        ) : (
          <div className="space-y-4">
            {assinaturas.map((a) => (
              <div key={a.id} className="flex items-center gap-4 p-3 border rounded-lg">
                {assinaturaUrls[a.id] ? (
                  <img src={assinaturaUrls[a.id]} alt={`Assinatura de ${a.nome_assinante}`} className="h-16 w-24 object-contain border rounded bg-background" />
                ) : (
                  <div className="h-16 w-24 flex items-center justify-center border rounded text-[10px] text-muted-foreground text-center px-1">
                    Carregando assinatura...
                  </div>
                )}
                <div>
                  <p className="font-medium">{a.nome_assinante}</p>
                  {a.cargo && <p className="text-sm text-muted-foreground">{a.cargo}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={a.tipo === 'responsavel_tecnico' ? 'default' : 'secondary'}>
                      {a.tipo === 'responsavel_tecnico' ? 'Resp. Técnico' : 'Cliente'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.data_assinatura + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
