import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import SensitiveValue from '@/components/dashboard/SensitiveValue';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

type Severidade = 'alta' | 'media';

interface Alerta {
  id: string;
  severidade: Severidade;
  urgencia: number; // maior = mais urgente (dias de atraso)
  texto: ReactNode;
  meta: string;
  rota: string;
}

function diasAtraso(dataRef: string, hoje: string): number {
  const diff = new Date(hoje + 'T00:00:00').getTime() - new Date(dataRef + 'T00:00:00').getTime();
  return Math.max(1, Math.round(diff / 86400000));
}

const estaConcluida = (a: { status?: string; percentual?: number }) =>
  a.status === 'concluido' || a.status === 'concluida' || (a.percentual ?? 0) >= 100;

function ultimoDiaUtil(hoje: Date): Date {
  const d = new Date(hoje);
  d.setDate(d.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ddmm = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

export default function RequerAtencaoWidget() {
  const { obras, atividades, parcelas, diarios, ferramentas, loading } = useDashboardData();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="h-full shadow-sm">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const hoje = iso(new Date());
  const alertas: Alerta[] = [];

  // Regra 1 — atividades em atraso
  atividades
    .filter(a => a.data_fim && a.data_fim < hoje && a.status !== 'concluida')
    .forEach(a => {
      const obra = obras.find(o => o.id === a.obra_id);
      alertas.push({
        id: `atv-${a.id}`,
        severidade: 'alta',
        urgencia: diasAtraso(a.data_fim!, hoje),
        texto: `${a.nome} — ${diasAtraso(a.data_fim!, hoje)} dias em atraso`,
        meta: obra?.nome || '',
        rota: '/cronograma',
      });
    });

  // Regra 2 — parcelas vencidas
  parcelas
    .filter(p => !p.data_recebimento && p.data_vencimento < hoje)
    .forEach(p => {
      alertas.push({
        id: `parc-${p.id}`,
        severidade: 'alta',
        urgencia: diasAtraso(p.data_vencimento, hoje),
        texto: <>Parcela <SensitiveValue>{fmt(p.valor)}</SensitiveValue> vencida há {diasAtraso(p.data_vencimento, hoje)} dias</>,
        meta: 'Financeiro',
        rota: '/financeiro',
      });
    });

  // Regra 3 — diário não registrado no último dia útil
  const ultimoUtil = ultimoDiaUtil(new Date());
  const ultimoUtilIso = iso(ultimoUtil);
  obras
    .filter(o => o.status === 'andamento' || o.status === 'planejamento')
    .forEach(o => {
      const tem = diarios.some(d => d.obra_id === o.id && d.data === ultimoUtilIso);
      if (!tem) {
        alertas.push({
          id: `diario-${o.id}`,
          severidade: 'media',
          urgencia: 0,
          texto: `Diário não registrado (${ddmm(ultimoUtilIso)})`,
          meta: o.nome,
          rota: '/diario',
        });
      }
    });

  // Regra 4 — ferramentas em manutenção
  ferramentas
    .filter(f => f.status === 'manutencao')
    .forEach(f => {
      alertas.push({
        id: `fer-${f.id}`,
        severidade: 'media',
        urgencia: 0,
        texto: `${f.nome} #${f.numero_cadastro} em manutenção`,
        meta: 'Ferramentas',
        rota: '/ferramentas',
      });
    });

  alertas.sort((a, b) => {
    if (a.severidade !== b.severidade) return a.severidade === 'alta' ? -1 : 1;
    return b.urgencia - a.urgencia;
  });

  const visiveis = alertas.slice(0, 6);
  const restantes = alertas.length - visiveis.length;

  return (
    <Card className="h-full shadow-sm">
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center justify-between gap-2 pb-1">
          <p className="text-xs text-muted-foreground">Requer Atenção</p>
          {alertas.length > 0 && (
            <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-destructive/10 text-destructive">
              {alertas.length} alerta{alertas.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {alertas.length === 0 ? (
          <div className="flex items-center gap-2 text-success text-sm">
            <CheckCircle2 className="h-4 w-4" />
            Nenhuma pendência — tudo em dia
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visiveis.map(a => (
              <button
                key={a.id}
                onClick={() => navigate(a.rota)}
                className="w-full flex items-center gap-2 py-2 px-1 text-left cursor-pointer hover:bg-muted/50 rounded transition-colors"
              >
                <span className={`h-2 w-2 rounded-full shrink-0 ${a.severidade === 'alta' ? 'bg-destructive' : 'bg-warning'}`} />
                <span className="text-sm truncate flex-1">{a.texto}</span>
                <span className="text-xs text-muted-foreground shrink-0 truncate max-w-[40%]">{a.meta}</span>
              </button>
            ))}
            {restantes > 0 && (
              <p className="py-2 px-1 text-xs text-muted-foreground">+{restantes} outras</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
