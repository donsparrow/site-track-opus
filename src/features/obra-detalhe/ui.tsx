import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export const fmtData = (d?: string | null) =>
  d ? new Date((d.length === 10 ? d + 'T00:00:00' : d)).toLocaleDateString('pt-BR') : '—';

/** Card padrão das abas: título, botão para o módulo, estados de carregando/vazio/erro. */
export function AbaCard({ titulo, link, linkLabel, isLoading, isError, vazio, vazioTexto, children }: {
  titulo: string; link?: string; linkLabel?: string; isLoading?: boolean; isError?: boolean;
  vazio?: boolean; vazioTexto?: string; children?: ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <CardTitle className="font-display text-base">{titulo}</CardTitle>
        {link && (
          <Button asChild variant="outline" size="sm" className="min-h-10 w-full sm:w-auto lg:min-h-9">
            <Link to={link}><ExternalLink className="mr-1 h-4 w-4" />{linkLabel}</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="min-w-0">
        {isLoading ? (
          <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-4 border-accent border-t-transparent" /></div>
        ) : isError ? (
          <p className="py-4 text-center text-sm text-destructive">Não foi possível carregar os dados.</p>
        ) : vazio ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{vazioTexto}</p>
        ) : children}
      </CardContent>
    </Card>
  );
}

export const LimiteAviso = ({ n }: { n: number }) =>
  n >= 20 ? <p className="mt-3 text-center text-xs text-muted-foreground">Mostrando os 20 mais recentes. Abra o módulo para ver todos.</p> : null;
