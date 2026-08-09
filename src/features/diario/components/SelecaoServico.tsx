import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { classificarServicos, type ServicoClassificado } from '../servicoDisponibilidade';
import type { CronogramaAtividadeOption } from '../types';

interface Props {
  atividades: CronogramaAtividadeOption[];
  /** IDs de cronograma_atividades já lançados neste diário. */
  lancadasIds: string[];
  value: string;
  onChange: (id: string) => void;
  /** Vínculo atual em modo edição — permanece sempre selecionável. */
  selecionadoId?: string | null;
  label?: string;
  placeholder?: string;
  permitirRetrabalho?: boolean;
}

function ItemServico({ item }: { item: ServicoClassificado }) {
  const { atividade, habilitado, badge } = item;
  return (
    <SelectItem
      value={atividade.id}
      disabled={!habilitado}
      className={habilitado ? undefined : 'text-muted-foreground'}
    >
      <span className="flex items-center gap-2">
        <span>
          {atividade.nome_atividade} — atual {atividade.percentual_concluido || 0}% (peso {atividade.peso || 0}%)
        </span>
        {badge && (
          <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{badge}</span>
        )}
      </span>
    </SelectItem>
  );
}

/** Select de serviço do cronograma com separação entre disponíveis e indisponíveis. */
export function SelecaoServico({
  atividades,
  lancadasIds,
  value,
  onChange,
  selecionadoId = null,
  label = 'Selecionar atividade do Cronograma *',
  placeholder = '▼ Escolha uma atividade',
  permitirRetrabalho = false,
}: Props) {
  const classificacao = useMemo(
    () => classificarServicos({ atividades, lancadasIds, selecionadoId, permitirRetrabalho }),
    [atividades, lancadasIds, selecionadoId, permitirRetrabalho],
  );

  const { disponiveis, indisponiveis, totalDisponiveis, total, todosIndisponiveis } = classificacao;

  return (
    <div className="flex flex-col gap-1">
      {label && <Label className="text-xs">{label}</Label>}
      <p className="text-[10px] text-muted-foreground">
        {totalDisponiveis} serviços disponíveis de {total}
      </p>
      {todosIndisponiveis && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300">
          Todos os serviços desta obra já foram concluídos ou lançados neste diário.
        </p>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {disponiveis.length > 0 && (
            <SelectGroup>
              <SelectLabel>Disponíveis</SelectLabel>
              {disponiveis.map((i) => <ItemServico key={i.atividade.id} item={i} />)}
            </SelectGroup>
          )}
          {indisponiveis.length > 0 && (
            <SelectGroup>
              <SelectLabel>Indisponíveis</SelectLabel>
              {indisponiveis.map((i) => <ItemServico key={i.atividade.id} item={i} />)}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
