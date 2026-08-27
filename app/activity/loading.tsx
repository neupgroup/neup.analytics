import { Card, CardContent } from '@/component/ui/card';
import { Skeleton } from '@/component/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading activity">
      <div className="space-y-2"><Skeleton className="h-9 w-32" /><Skeleton className="h-4 w-72" /></div>
      <div className="space-y-3">{[...Array(6)].map((_, index) => <Card key={index}><CardContent className="space-y-2 p-5"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/3" /></CardContent></Card>)}</div>
    </div>
  );
}
