import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingDown } from 'lucide-react';
import { fmt } from '../utils';

interface Props {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  loading?: boolean;
}

export default function ResumoFinanceiro({ totalReceitas, totalDespesas, saldo, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Receitas</p>
              <p className="text-2xl font-display font-bold text-success">{fmt(totalReceitas)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-success" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Despesas</p>
              <p className="text-2xl font-display font-bold text-destructive">{fmt(totalDespesas)}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-destructive" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo</p>
              <p className={`text-2xl font-display font-bold ${saldo < 0 ? 'text-destructive' : 'text-success'}`}>
                {fmt(saldo)}
              </p>
            </div>
            <DollarSign className={`h-8 w-8 ${saldo < 0 ? 'text-destructive' : 'text-success'}`} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
