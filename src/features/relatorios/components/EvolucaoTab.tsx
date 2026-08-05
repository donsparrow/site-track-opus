import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DadosRelatorio } from '../types';
import { fmt } from '../utils';

interface AtividadeItem { diario_id: string; descricao: string; percentual?: number | null; }
interface EquipeItem { diario_id: string; funcao?: string | null; }
interface DiarioItem { id: string; data: string; }

export default function EvolucaoTab({ dados }: { dados: DadosRelatorio }) {
  const diarios = dados.diarios as DiarioItem[];
  const atividades = dados.atividades as AtividadeItem[];
  const equipe = dados.equipe as EquipeItem[];

  const atividadesByDesc = new Map<string, { diarioData: string; percentual: number }[]>();
  diarios.forEach((diario) => {
    atividades.filter((a) => a.diario_id === diario.id).forEach((a) => {
      if (!atividadesByDesc.has(a.descricao)) atividadesByDesc.set(a.descricao, []);
      atividadesByDesc.get(a.descricao)!.push({ diarioData: diario.data, percentual: a.percentual || 0 });
    });
  });

  const diasComEquipe = diarios
    .map((d) => ({ data: d.data, equipe: equipe.filter((e) => e.diario_id === d.id) }))
    .filter((d) => d.equipe.length > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm font-display">Evolução das Atividades por Dia</CardTitle></CardHeader>
        <CardContent>
          {diarios.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Consolide os dados para visualizar</p>
          ) : atividadesByDesc.size === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade no período</p>
          ) : (
            <div className="space-y-4">
              {Array.from(atividadesByDesc.entries()).map(([desc, entries]) => {
                const sorted = [...entries].sort((a, b) => a.diarioData.localeCompare(b.diarioData));
                return (
                  <div key={desc} className="border rounded-lg p-3">
                    <p className="font-medium text-sm mb-2">{desc}</p>
                    <div className="space-y-1">
                      {sorted.map((entry, idx) => {
                        const prevPerc = idx > 0 ? sorted[idx - 1].percentual : 0;
                        const evolucao = entry.percentual - prevPerc;
                        return (
                          <div key={`${entry.diarioData}-${idx}`} className="flex items-center gap-3 text-xs">
                            <span className="text-muted-foreground w-20">{fmt(entry.diarioData)}</span>
                            <span className="w-24">anterior: {prevPerc}%</span>
                            <span className="w-20">atual: {entry.percentual}%</span>
                            <Badge variant={evolucao > 0 ? 'default' : evolucao === 0 ? 'outline' : 'destructive'} className="text-xs">
                              {evolucao > 0 ? '+' : ''}{evolucao}%
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm font-display">Equipe por Dia</CardTitle></CardHeader>
        <CardContent>
          {diarios.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Consolide os dados para visualizar</p>
          ) : diasComEquipe.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro de equipe no período</p>
          ) : (
            <div className="space-y-3">
              {diasComEquipe.map((dia) => {
                const byFuncao = new Map<string, number>();
                dia.equipe.forEach((e) => {
                  const key = e.funcao || 'Sem função';
                  byFuncao.set(key, (byFuncao.get(key) || 0) + 1);
                });
                return (
                  <div key={dia.data} className="border rounded-lg p-3">
                    <p className="font-medium text-sm mb-1">{fmt(dia.data)}</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(byFuncao.entries()).map(([funcao, count]) => (
                        <Badge key={funcao} variant="secondary" className="text-xs">{count} {funcao}</Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
