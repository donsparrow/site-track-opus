import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DocumentacaoSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,1fr)_2fr] gap-6">
      <Card className="lg:col-span-1">
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
