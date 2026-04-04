import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, ClipboardList, Activity, AlertTriangle, Flag, Filter, Image as ImageIcon, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface TimelineEvent {
  id: string;
  date: string;
  type: 'diario' | 'atividade' | 'ocorrencia' | 'marco';
  title: string;
  description?: string;
  details?: Record<string, string | number | null>;
  images?: string[];
  percentual?: number;
}

interface TimelineObraProps {
  obraId: string;
  obraData?: {
    data_inicio?: string | null;
    data_fim_prevista?: string | null;
    status?: string;
    created_at?: string;
  };
}

const typeConfig = {
  diario: { label: 'Diário', icon: ClipboardList, color: 'bg-blue-500', badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  atividade: { label: 'Atividade', icon: Activity, color: 'bg-green-500', badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  ocorrencia: { label: 'Ocorrência', icon: AlertTriangle, color: 'bg-red-500', badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  marco: { label: 'Marco', icon: Flag, color: 'bg-purple-500', badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
};

export default function TimelineObra({ obraId, obraData }: TimelineObraProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('todos');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTimeline();
  }, [obraId]);

  const fetchTimeline = async () => {
    setLoading(true);
    const allEvents: TimelineEvent[] = [];

    // Marcos da obra
    if (obraData?.created_at) {
      allEvents.push({
        id: 'marco-criacao',
        date: obraData.created_at.split('T')[0],
        type: 'marco',
        title: 'Obra criada no sistema',
      });
    }
    if (obraData?.data_inicio) {
      allEvents.push({
        id: 'marco-inicio',
        date: obraData.data_inicio,
        type: 'marco',
        title: 'Início da obra',
      });
    }
    if (obraData?.status === 'concluida' && obraData?.data_fim_prevista) {
      allEvents.push({
        id: 'marco-conclusao',
        date: obraData.data_fim_prevista,
        type: 'marco',
        title: 'Obra concluída',
      });
    }

    // Diários
    const { data: diarios } = await supabase
      .from('diario_obra')
      .select('id, data, clima, temperatura, horario_inicio, horario_fim, observacoes_gerais')
      .eq('obra_id', obraId)
      .order('data', { ascending: false });

    if (diarios && diarios.length > 0) {
      const diarioIds = diarios.map(d => d.id);

      const [ativRes, equipeRes, imgRes, ocorrRes] = await Promise.all([
        supabase.from('diario_atividades').select('diario_id, descricao, status, percentual').in('diario_id', diarioIds),
        supabase.from('diario_equipe').select('diario_id, nome_funcionario, funcao').in('diario_id', diarioIds),
        supabase.from('diario_imagens').select('diario_id, url, descricao').in('diario_id', diarioIds),
        supabase.from('diario_ocorrencias').select('diario_id, descricao, impacto').in('diario_id', diarioIds),
      ]);

      const ativByDiario = groupBy(ativRes.data || [], 'diario_id');
      const equipeByDiario = groupBy(equipeRes.data || [], 'diario_id');
      const imgByDiario = groupBy(imgRes.data || [], 'diario_id');
      const ocorrByDiario = groupBy(ocorrRes.data || [], 'diario_id');

      for (const d of diarios) {
        const atividades = ativByDiario[d.id] || [];
        const equipe = equipeByDiario[d.id] || [];
        const imgs = imgByDiario[d.id] || [];
        const avgPerc = atividades.length > 0
          ? Math.round(atividades.reduce((s: number, a: any) => s + (a.percentual || 0), 0) / atividades.length)
          : undefined;

        const parts: string[] = [];
        if (d.clima) parts.push(`Clima: ${d.clima}`);
        if (d.temperatura) parts.push(`${d.temperatura}`);
        if (equipe.length > 0) parts.push(`${equipe.length} profissional(is)`);
        if (atividades.length > 0) parts.push(`${atividades.length} atividade(s)`);

        allEvents.push({
          id: `diario-${d.id}`,
          date: d.data,
          type: 'diario',
          title: `Diário de obra`,
          description: parts.join(' · ') || d.observacoes_gerais || undefined,
          details: {
            clima: d.clima,
            temperatura: d.temperatura,
            horario: d.horario_inicio && d.horario_fim ? `${d.horario_inicio} - ${d.horario_fim}` : null,
            equipe: equipe.map((e: any) => `${e.nome_funcionario}${e.funcao ? ` (${e.funcao})` : ''}`).join(', ') || null,
            atividades: atividades.map((a: any) => `${a.descricao} - ${a.percentual || 0}%`).join('; ') || null,
            observacoes: d.observacoes_gerais,
          },
          images: imgs.map((i: any) => i.url),
          percentual: avgPerc,
        });

        // Ocorrências como eventos separados
        const ocorr = ocorrByDiario[d.id] || [];
        for (const o of ocorr) {
          allEvents.push({
            id: `ocorr-${o.id || d.id}-${Math.random()}`,
            date: d.data,
            type: 'ocorrencia',
            title: (o as any).descricao,
            description: `Impacto: ${(o as any).impacto}`,
          });
        }
      }
    }

    // Atividades do cronograma
    const { data: cronogramas } = await supabase
      .from('cronograma')
      .select('id')
      .eq('obra_id', obraId);

    if (cronogramas && cronogramas.length > 0) {
      const cronIds = cronogramas.map(c => c.id);
      const { data: cronAtividades } = await supabase
        .from('cronograma_atividades')
        .select('*')
        .in('cronograma_id', cronIds)
        .order('data_inicio');

      for (const a of cronAtividades || []) {
        allEvents.push({
          id: `ativ-${a.id}`,
          date: a.data_inicio || a.created_at.split('T')[0],
          type: 'atividade',
          title: a.nome_atividade,
          description: a.data_fim ? `Término: ${fmtDate(a.data_fim)}` : undefined,
          percentual: a.percentual_concluido,
          details: {
            status: a.status,
            inicio: a.data_inicio,
            fim: a.data_fim,
          },
        });
      }
    }

    // Sort: most recent first
    allEvents.sort((a, b) => b.date.localeCompare(a.date));
    setEvents(allEvents);
    setLoading(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = filterType === 'todos' ? events : events.filter(e => e.type === filterType);

  // Group by date
  const grouped: Record<string, TimelineEvent[]> = {};
  for (const e of filtered) {
    if (!grouped[e.date]) grouped[e.date] = [];
    grouped[e.date].push(e);
  }
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <div className="animate-spin h-6 w-6 border-4 border-accent border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle className="font-display flex items-center gap-2">
          <Calendar className="h-5 w-5" /> Timeline da Obra
        </CardTitle>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="diario">Diários</SelectItem>
              <SelectItem value="atividade">Atividades</SelectItem>
              <SelectItem value="ocorrencia">Ocorrências</SelectItem>
              <SelectItem value="marco">Marcos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento encontrado.</p>
        ) : (
          <ScrollArea className="max-h-[600px]">
            <div className="relative pl-8">
              {/* Vertical line */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

              {sortedDates.map((date) => (
                <div key={date} className="mb-6">
                  {/* Date header */}
                  <div className="relative flex items-center gap-3 mb-3">
                    <div className="absolute left-[-20px] w-6 h-6 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{fmtDate(date)}</span>
                  </div>

                  {/* Events for this date */}
                  {grouped[date].map((event) => {
                    const config = typeConfig[event.type];
                    const Icon = config.icon;
                    const isExpanded = expandedIds.has(event.id);

                    return (
                      <div key={event.id} className="relative ml-4 mb-3">
                        {/* Dot */}
                        <div className={`absolute left-[-32px] top-2 w-3 h-3 rounded-full ${config.color}`} />

                        <div
                          className="border rounded-lg p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => toggleExpand(event.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">{event.title}</span>
                                  <Badge className={`text-xs ${config.badgeClass} border-0`}>{config.label}</Badge>
                                </div>
                                {event.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
                                )}
                                {event.percentual !== undefined && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <Progress value={event.percentual} className="h-1.5 flex-1 max-w-[120px]" />
                                    <span className="text-xs font-medium text-muted-foreground">{event.percentual}%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {event.images && event.images.length > 0 && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <ImageIcon className="h-3 w-3" /> {event.images.length}
                                </span>
                              )}
                              {event.details && (
                                isExpanded
                                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* Expanded details */}
                          {isExpanded && event.details && (
                            <div className="mt-3 pt-3 border-t space-y-1.5">
                              {Object.entries(event.details).map(([key, val]) => {
                                if (!val) return null;
                                return (
                                  <div key={key} className="flex gap-2 text-xs">
                                    <span className="text-muted-foreground capitalize font-medium min-w-[80px]">{key}:</span>
                                    <span className="text-foreground">{String(val)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Images preview */}
                          {isExpanded && event.images && event.images.length > 0 && (
                            <div className="mt-3 pt-3 border-t flex gap-2 flex-wrap">
                              {event.images.slice(0, 4).map((url, i) => (
                                <img
                                  key={i}
                                  src={url}
                                  alt=""
                                  className="h-16 w-16 rounded object-cover border"
                                  loading="lazy"
                                />
                              ))}
                              {event.images.length > 4 && (
                                <div className="h-16 w-16 rounded border flex items-center justify-center text-xs text-muted-foreground bg-muted">
                                  +{event.images.length - 4}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function groupBy<T>(arr: T[], key: string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const k = (item as any)[key];
    if (!result[k]) result[k] = [];
    result[k].push(item);
  }
  return result;
}

function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}
