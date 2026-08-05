import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { DadosRelatorio } from '../types';
import { getSmartStatus } from '../utils';

interface CronogramaItem { peso?: number | null; percentual_concluido: number; nome_atividade: string; status: string; }
interface EquipeItem { diario_id: string; funcao?: string | null; }
interface DiarioItem { id: string; data: string; }
interface OcorrenciaItem { impacto: string; }

export default function ResumoTab({ dados }: { dados: DadosRelatorio }) {
  const { prazos } = dados;
  const smartStatus = getSmartStatus(prazos);
  const cronograma = dados.cronograma as CronogramaItem[];
  const diarios = dados.diarios as DiarioItem[];
  const equipe = dados.equipe as EquipeItem[];
  const ocorrencias = dados.ocorrencias as OcorrenciaItem[];

  const diasComEquipe = diarios
    .map((d) => equipe.filter((e) => e.diario_id === d.id))
    .filter((e) => e.length > 0);
  const teamCounts = diasComEquipe.map((e) => e.length);
  const teamMedia = teamCounts.length > 0 ? Math.round(teamCounts.reduce((s, c) => s + c, 0) / teamCounts.length) : 0;
  const teamMax = teamCounts.length > 0 ? Math.max(...teamCounts) : 0;
  const teamMin = teamCounts.length > 0 ? Math.min(...teamCounts) : 0;

  return (
    <div className="space-y-4">
      <Card className={`border ${smartStatus.bg}`}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className={`text-2xl ${smartStatus.color}`}>●</span>
              <div>
                <p className={`font-bold text-lg ${smartStatus.color}`}>{smartStatus.label}</p>
                <p className="text-xs text-muted-foreground">
                  Obra executada: {prazos.percentualExecutado}% | Tempo consumido: {prazos.percentualTempo}%
                </p>
              </div>
            </div>
            <span className="text-3xl font-bold text-primary">{prazos.percentualExecutado}%</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Execução</span>
              <div className="flex-1"><Progress value={prazos.percentualExecutado} className="h-2" /></div>
              <span>{prazos.percentualExecutado}%</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-[52px]">Tempo</span>
              <div className="flex-1"><Progress value={Math.min(prazos.percentualTempo, 100)} className="h-2" /></div>
              <span>{prazos.percentualTempo}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Diários</p>
          <p className="text-2xl font-bold font-display">{diarios.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Equipe Média</p>
          <p className="text-2xl font-bold font-display">{teamMedia}</p>
          <p className="text-[10px] text-muted-foreground">Máx: {teamMax} | Mín: {teamMin}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Atividades</p>
          <p className="text-2xl font-bold font-display">{dados.atividades.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Ocorrências</p>
          <p className="text-2xl font-bold font-display">{ocorrencias.length}</p>
          <p className="text-[10px] text-destructive">
            {ocorrencias.filter((o) => o.impacto === 'alto').length} alto impacto
          </p>
        </CardContent></Card>
      </div>

      {cronograma.length > 0 && (
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm font-display">Cronograma da Obra</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cronograma.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-8">{c.peso || 0}%</span>
                  <span className="text-sm flex-1 truncate">{c.nome_atividade}</span>
                  <Progress value={c.percentual_concluido} className="h-2 w-24" />
                  <span className="text-xs font-medium w-10 text-right">{c.percentual_concluido}%</span>
                  <Badge variant="outline" className="text-[10px]">
                    {c.status === 'concluido' ? 'Concluído' : c.status === 'em_andamento' ? 'Em Andamento' : 'Não Iniciado'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
