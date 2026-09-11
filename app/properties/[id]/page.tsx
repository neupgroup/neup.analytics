import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { Link } from '@neup/components/ui/link';
import { ArrowRight, Building2, Code2, Database, Globe, Layers3, ShieldCheck } from 'lucide-react';
import { prisma } from '@neup/core/database/prisma';
import { Badge } from '@neup/components/ui/badge';
import { Button } from '@neup/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@neup/components/ui/card';
import { Separator } from '@neup/components/ui/separator';
import { PropertySetupGuide } from '@/components/properties/property-setup-guide';

function buildCollectorSnippet(propertyId: string) {
  return `<script>
  (function () {
    const siteId = '${propertyId}';
    const endpoint = 'https://analytics.yourdomain.com/api/collect?siteId=' + encodeURIComponent(siteId);

    window.neupAnalytics = window.neupAnalytics || {};
    window.neupAnalytics.init = function init() {
      const payload = {
        siteId,
        pagePath: location.pathname,
        content: document.documentElement.outerHTML,
        window: { width: window.innerWidth, height: window.innerHeight },
        userAgent: navigator.userAgent,
        events: []
      };

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    };
  })();
</script>`;
}

async function getCollectorEndpoint(propertyId: string) {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') || 'https';

  if (!host) {
    return `/api/collect?siteId=${propertyId}`;
  }

  return `${protocol}://${host}/api/collect?siteId=${propertyId}`;
}

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

  const collectorEndpoint = await getCollectorEndpoint(application.id);
  const collectorSnippet = buildCollectorSnippet(application.id);
  const isActive = application.status === 'active';

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
        <Link variant="tinted" className="w-full sm:w-fit" href="/properties">
            Back to properties
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
      </div>

      {isActive ? (
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-2xl">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Installation verified
            </CardTitle>
            <CardDescription>
              This property is active, so the setup guide is hidden.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>The collector endpoint is live for this property.</p>
            <p className="font-mono text-xs break-all text-foreground">{collectorEndpoint}</p>
          </CardContent>
        </Card>
      ) : (
        <PropertySetupGuide propertyId={application.id} collectorEndpoint={collectorEndpoint} />
      )}

      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-2xl">
            <Code2 className="h-5 w-5 text-primary" />
            Collector details
          </CardTitle>
          <CardDescription>
            This property is treated as a site allowlist for browser traffic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
            <p className="font-medium">Collector endpoint</p>
            <p className="font-mono text-xs break-all text-muted-foreground">
              {collectorEndpoint}
            </p>
          </div>
          <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
            <p className="font-medium">Allowed origins</p>
            <div className="flex flex-wrap gap-2">
              {application.sites.map((site) => (
                <Badge key={site} variant="secondary" className="font-normal">
                  {site}
                </Badge>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-muted-foreground">
              {collectorSnippet}
            </pre>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ID</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono break-all text-muted-foreground">{application.id}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base paths</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{application.sites.length}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card shadow-sm">
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
        <Card className="border-border/60 bg-card shadow-sm">
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
          <Card className="border-border/60 bg-card shadow-sm">
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

          <Card className="border-border/60 bg-card shadow-sm">
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
