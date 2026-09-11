import { LinkButton } from '@neup/components/ui/link-button';
import { ArrowRight, Building2, Database, Globe, Layers3 } from 'lucide-react';
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

export default async function PropertiesPage() {
  const applications = await prisma.application.findMany({
    orderBy: { name: 'asc' },
  });

  const totalSites = applications.reduce(
    (count, application) => count + application.sites.length,
    0
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Badge variant="secondary" className="w-fit">
            Properties
          </Badge>
          <div className="space-y-2">
            <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
              Websites and applications
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              All listed sites and applications are stored in the Application table.
            </p>
          </div>
        </div>
            <LinkButton variant="solid" className="w-full sm:w-fit" href="/properties/add">
            Add property
            <ArrowRight className="ml-2 h-4 w-4" />
          </LinkButton>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{applications.length}</div>
            <p className="text-xs text-muted-foreground">Saved property groups</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base paths</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{totalSites}</div>
            <p className="text-xs text-muted-foreground">Tracked website entries</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">Application</div>
            <p className="text-xs text-muted-foreground">Single source of truth</p>
          </CardContent>
        </Card>
      </div>

      {applications.length === 0 ? (
        <Card className="border-border/60 bg-card shadow-sm">
          <CardContent className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-12 text-center">
            <Layers3 className="h-14 w-14 text-muted-foreground" />
            <div className="space-y-2">
              <h2 className="font-headline text-2xl font-semibold">No properties yet</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Add a site or application first, and it will appear here.
              </p>
            </div>
            <LinkButton variant="solid" href="/properties/add">
                Create the first property
                <ArrowRight className="ml-2 h-4 w-4" />
              </LinkButton>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {applications.map((application) => (
            <Card
              key={application.id}
              className="border-border/60 bg-card shadow-sm"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="font-headline text-2xl">
                      {application.name}
                    </CardTitle>
                    <CardDescription>
                      {application.sites.length} base path
                      {application.sites.length === 1 ? '' : 's'} registered
                    </CardDescription>
                  </div>
                  <Badge
                    variant={application.status === 'active' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {application.status}
                  </Badge>
                  <LinkButton variant="tinted" size="sm" href={`/properties/${application.id}`}>
                      View
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </LinkButton>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Base paths
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {application.sites.map((site) => (
                      <Badge key={site} variant="secondary" className="font-normal">
                        {site}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Details</p>
                  <p className="text-sm text-muted-foreground">
                    {application.details?.trim() || 'No details added yet.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
