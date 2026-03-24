import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Relatorios() {
  const [obras, setObras] = useState<any[]>([]);
  const [selectedObra, setSelectedObra] = useState('');
  const [atividades, setAtividades] = useState<any[]>([]);
  const [progressoGeral, setProgressoGeral] = useState(0);

  useEffect(() => {
    supabase.from('obras').select('id, nome').order('nome').then(({ data }) => setObras(data || []));
  }, []);

  useEffect(() => {
    if (!selectedObra) return;
    supabase.from('atividades_obra').select('*').eq('obra_id', selectedObra).order('created_at').then(({ data }) => {
      const atv = data || [];
      setAtividades(atv);
      const avg = atv.length > 0 ? atv.reduce((s, a) => s + a.percentual, 0) / atv.length : 0;
      setProgressoGeral(Math.round(avg));
    });
  }, [selectedObra]);

  const statusLabels: Record<string, string> = { pendente: 'Pendente', andamento: 'Em andamento', concluido: 'Concluído' };

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-8">Relatórios</h1>

      <div className="mb-6 max-w-sm">
        <Select value={selectedObra} onValueChange={setSelectedObra}>
          <SelectTrigger><SelectValue placeholder="Selecione uma obra" /></SelectTrigger>
          <SelectContent>
            {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedObra && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display">Progresso Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={progressoGeral} className="flex-1" />
                <span className="text-lg font-display font-bold">{progressoGeral}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display">Atividades</CardTitle>
            </CardHeader>
            <CardContent>
              {atividades.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Nenhuma atividade registrada</p>
              ) : (
                <div className="space-y-4">
                  {atividades.map(a => (
                    <div key={a.id} className="flex items-center gap-4 p-3 rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{a.nome}</span>
                          <Badge variant="secondary">{statusLabels[a.status] || a.status}</Badge>
                        </div>
                        <Progress value={a.percentual} className="h-2" />
                      </div>
                      <span className="text-sm font-display font-bold w-12 text-right">{a.percentual}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
