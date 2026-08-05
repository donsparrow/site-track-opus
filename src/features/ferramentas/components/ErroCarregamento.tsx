import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  message?: string;
  onRetry: () => void;
}

export default function ErroCarregamento({ message, onRetry }: Props) {
  return (
    <Card>
      <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {message || 'Não foi possível carregar os dados financeiros.'}
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>Tentar novamente</Button>
      </CardContent>
    </Card>
  );
}
