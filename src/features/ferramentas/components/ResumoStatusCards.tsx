import { Card, CardContent } from '@/components/ui/card';
import { STATUS_CONFIG, type Ferramenta } from '../types';

interface Props {
  ferramentas: Ferramenta[];
}

export default function ResumoStatusCards({ ferramentas }: Props) {
  const countByStatus = (s: string) => ferramentas.filter((f) => f.status === s).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {Object.entries(STATUS_CONFIG).map(([key, { label, color }]) => (
        <Card key={key}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${color}`} />
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{countByStatus(key)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
