import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wallet, Trash2, Lock } from 'lucide-react';
import type { AdiantamentoSaldo, Funcionario } from '../types';
import { parseISODate } from '../utils';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dt = (iso: string) => parseISODate(iso).toLocaleDateString('pt-BR');

export const PARCELA_FECHAMENTO = 'Parcela de adiantamento (fechamento)';
export const PARCELA_TOOLTIP =
  'Gerado automaticamente pelo fechamento de quinzena. Para remover, reabra o fechamento correspondente na aba Fechamentos.';

interface Props {
  adiantamentos: AdiantamentoSaldo[];
  funcionarios: Funcionario[];
  isLoading: boolean;
  canEdit: boolean;
  onDelete: (id: string) => void;
}

export default function AdiantamentosPanel({ adiantamentos, funcionarios, isLoading, canEdit, onDelete }: Props) {
  const nome = (id: string) => funcionarios.find((f) => f.id === id)?.nome ?? '—';
  const [pendente, setPendente] = useState<{ id: string; mensagem: string } | null>(null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4" /> Adiantamentos em aberto
          {!isLoading && adiantamentos.length > 0 && (
            <Badge variant="secondary">{adiantamentos.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : adiantamentos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum adiantamento ou vale em aberto.
          </p>
        ) : (
          <TooltipProvider>
            <Accordion type="multiple" className="w-full">
              {adiantamentos.map((a) => (
                <AccordionItem key={a.id} value={a.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 pr-3 text-left text-sm">
                      <span className="font-medium min-w-[140px]">{nome(a.funcionario_id)}</span>
                      <span className="text-muted-foreground">{dt(a.data)}</span>
                      <span className="capitalize text-muted-foreground">{a.tipo}</span>
                      <span>Original: <strong>{brl(a.valor)}</strong></span>
                      <span className="text-muted-foreground">Descontado: {brl(a.totalDescontado)}</span>
                      <span className="ml-auto flex items-center gap-2">
                        <span>Saldo: <strong>{brl(Math.max(a.saldo, 0))}</strong></span>
                        <Badge variant={a.quitado ? 'secondary' : 'default'}>
                          {a.quitado ? 'Quitado' : 'Em aberto'}
                        </Badge>
                        {canEdit && (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <span
                              role="button"
                              aria-label="Excluir adiantamento"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setPendente({
                                  id: a.id,
                                  mensagem:
                                    a.descontos.length > 0
                                      ? `Este vale/adiantamento tem ${a.descontos.length} desconto(s) vinculado(s). Eles não serão excluídos, mas perderão o vínculo com este lançamento.`
                                      : 'Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.',
                                });
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </span>
                          </Button>
                        )}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {a.descontos.length === 0 ? (
                      <p className="text-sm text-muted-foreground pl-1">Nenhum desconto vinculado ainda.</p>
                    ) : (
                      <ul className="space-y-1 pl-1">
                        {a.descontos.map((d, i) => (
                          <li key={d.id} className="flex items-center gap-3 text-sm">
                            <span className="text-muted-foreground w-16">#{i + 1}</span>
                            <span className="w-24">{dt(d.data)}</span>
                            <span className="font-medium">{brl(Number(d.valor))}</span>
                            <span className="text-muted-foreground">{d.descricao || ''}</span>
                            <span className="ml-auto">
                              {d.descricao === PARCELA_FECHAMENTO ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">{PARCELA_TOOLTIP}</TooltipContent>
                                </Tooltip>
                              ) : canEdit ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  aria-label="Excluir desconto"
                                  onClick={() =>
                                    setPendente({
                                      id: d.id,
                                      mensagem: 'Tem certeza que deseja excluir este desconto? Esta ação não pode ser desfeita.',
                                    })
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TooltipProvider>
        )}
      </CardContent>

      <AlertDialog open={!!pendente} onOpenChange={(o) => !o && setPendente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento</AlertDialogTitle>
            <AlertDialogDescription>{pendente?.mensagem}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendente) onDelete(pendente.id);
                setPendente(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
