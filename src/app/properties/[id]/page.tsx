import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Building2, Database, Globe, Layers3 } from 'lucide-react';
import { prisma } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const application = await prisma.application.findUnique({
    where: { id },
  });

  if (!application) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Badge variant="secondary" className="w-fit">
            Property detail
          </Badge>
          <div className="space-y-2">
            <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
              {application.name}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Base paths and metadata stored in the Application table.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-fit">
          <Link href="/properties">
            Back to properties
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ID</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono break-all text-muted-foreground">{application.id}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base paths</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{application.sites.length}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Type</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">Application</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Base paths</CardTitle>
            <CardDescription>
              All websites and base paths linked to this property.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {application.sites.map((site) => (
              <div key={site} className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                {site}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle className="font-headline text-xl">Details</CardTitle>
              <CardDescription>Optional notes saved with this property.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {application.details?.trim() || 'No details added yet.'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle className="font-headline text-xl">Record summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <p className="font-medium">Name</p>
                <p className="text-muted-foreground">{application.name}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="font-medium">ID prefix</p>
                <p className="text-muted-foreground">{application.id.slice(0, 8)}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="font-medium">Sites tracked</p>
                <p className="text-muted-foreground">{application.sites.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}