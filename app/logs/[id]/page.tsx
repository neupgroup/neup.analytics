import { prisma } from '@neup/core/database/prisma';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@neup/components/ui/card';

export default async function LogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id) return notFound();

  const interaction = await prisma.interaction.findUnique({
    where: { id },
    include: { events: true },
  });

  if (!interaction) return notFound();

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-2xl">Interaction {interaction.id}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs">{JSON.stringify({
            id: interaction.id,
            createdAt: interaction.createdAt,
            pagePath: interaction.pagePath,
            pageId: interaction.pageId,
            userId: interaction.userId,
            eventsCount: interaction.events.length,
          }, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs">{JSON.stringify(interaction.events, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
