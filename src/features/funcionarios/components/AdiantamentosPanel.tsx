import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Wallet } from 'lucide-react';
import type { AdiantamentoSaldo, Funcionario } from '../types';
import { parseISODate } from '../utils';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dt = (iso: string) => parseISODate(iso).toLocaleDateString('pt-BR');

interface Props {
  adiantamentos: AdiantamentoSaldo[];
  funcionarios: Funcionario[];
  isLoading: boolean;
}

export default function AdiantamentosPanel({ adiantamentos, funcionarios, isLoading }: Props) {
  const nome = (id: string) => funcionarios.find((f) => f.id === id)?.nome ?? '—';

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
                        </li>
                      ))}
                    </ul>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
