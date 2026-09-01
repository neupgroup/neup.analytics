import { prisma } from '#/core/database/prisma';
import { Link } from '#/components/ui/link';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
import { format } from 'date-fns';

export default async function LogsPage() {
  const interactions = await prisma.interaction.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      pagePath: true,
      pageId: true,
      userId: true,
      _count: { select: { events: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-2xl">Logs</h1>
      </div>

      <div className="grid gap-4">
        {interactions.map((it) => (
          <Card key={it.id} className="border-border/60 bg-card">
            <CardHeader>
              <CardTitle className="text-sm">{it.pagePath || '(no path)'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">{it.userId ? `user: ${it.userId}` : 'anonymous'}</div>
              <div className="text-xs text-muted-foreground">events: {it._count.events}</div>
              <div className="text-xs text-muted-foreground">pageId: {it.pageId ?? '—'}</div>
              <div className="text-xs text-muted-foreground">{format(new Date(it.createdAt), 'PPpp')}</div>
              <div className="mt-2">
                <Link href={`/logs/${it.id}`} className="text-primary underline">View details</Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
