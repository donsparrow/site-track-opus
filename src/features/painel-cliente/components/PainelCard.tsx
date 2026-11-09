import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Props {
  titulo: string;
  link?: { to: string; label: string };
  isLoading?: boolean;
  isError?: boolean;
  className?: string;
  children: ReactNode;
}

/** Moldura comum dos cards do Painel: skeleton próprio e erro isolado. */
export default function PainelCard({ titulo, link, isLoading, isError, className, children }: Props) {
  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="font-display text-base">{titulo}</CardTitle>
        {link && (
          <Link to={link.to} className="text-sm font-medium text-accent hover:underline whitespace-nowrap">{link.label}</Link>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-4/5" /><Skeleton className="h-5 w-3/5" /></div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">Não foi possível carregar esta seção agora.</p>
        ) : children}
      </CardContent>
    </Card>
  );
}
