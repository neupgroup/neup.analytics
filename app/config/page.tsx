import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Code2, Settings2, Waypoints } from 'lucide-react';
import { prisma } from '@neup/core/database/prisma';
import { Badge } from '@neup/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@neup/components/ui/card';
import { makeAppPath } from '@neup/core/appconfig';
import { ProjectKeyGenerator } from '@/components/project-key-generator';
import { ServerAddressForm } from '@/components/server-address-form';
import { FrameworkSelector } from '@/components/framework-selector';
import { NextJsSetupGuidelines } from '@/components/nextjs-setup-guidelines';
import { LinkButton } from '@neup/components/ui/link-button';

type ConfigPageProps = {
  searchParams?: Promise<{
    selectedProject?: string;
  }>;
};

async function getScriptUrls(projectId: string) {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') || 'https';
  const sdkPath = '/bridge/sdk.v1/interactions';

  if (!host) {
    return {
      sdkUrl: makeAppPath(sdkPath),
      activityEndpoint: `/bridge/api.v1/activity?project=${encodeURIComponent(projectId)}`,
    };
  }

  const origin = `${protocol}://${host}`;

  return {
    sdkUrl: `${origin}${makeAppPath(sdkPath)}`,
    activityEndpoint: `${origin}${makeAppPath(`/bridge/api.v1/activity?project=${encodeURIComponent(projectId)}`)}`,
  };
}

function buildSnippet({
  projectId,
  sdkUrl,
  activityEndpoint,
}: {
  projectId: string;
  sdkUrl: string;
  activityEndpoint: string;
}) {
  return `<script
  async
  src="${sdkUrl}"
  data-project-id="${projectId}"
  data-endpoint="${activityEndpoint}"
  data-mode="activity"
  data-collect="pageview,requests"
></script>`;
}

export default async function ConfigPage({ searchParams }: ConfigPageProps) {
  const params = await searchParams;
  const selectedProject = params?.selectedProject?.trim();

  if (!selectedProject) {
    redirect('/projects');
  }

  const project = await prisma.project.findUnique({
    where: {
      id: selectedProject,
    },
  });

  if (!project) {
    redirect('/projects');
  }

  const { sdkUrl, activityEndpoint } = await getScriptUrls(project.id);
  const snippet = buildSnippet({
    projectId: project.id,
    sdkUrl,
    activityEndpoint,
  });

  return (
    <div className="space-y-12">
      <div className="space-y-3">
        <Badge variant="secondary" className="w-fit">
          Project config
        </Badge>
        <div className="space-y-2">
          <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
            SDK configuration
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
            Keep the `sdk.js` layer on this project to auto-capture page views and browser requests.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected project</CardTitle>
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{project.path}</div>
            <p className="text-xs text-muted-foreground">{project.type}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SDK source</CardTitle>
            <Code2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="break-all font-mono text-xs text-muted-foreground">{sdkUrl}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity endpoint</CardTitle>
            <Waypoints className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="break-all font-mono text-xs text-muted-foreground">{activityEndpoint}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="p-0">
          <CardTitle className="font-headline text-2xl"><span className="mr-2">1.</span>Choose your language or framework</CardTitle>
          <CardDescription>
            Select the language or framework your site or app is built with to get the right setup instructions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <FrameworkSelector />
        </CardContent>
      </Card>

      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="p-0">
          <CardTitle className="font-headline text-2xl"><span className="mr-2">2.</span>Setup Project credentials</CardTitle>
          <CardDescription>
            Generate a project secret to authenticate analytics contexts. Store it in your server environment; analytics stores the matching secret for verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <ProjectKeyGenerator projectId={project.id} hasProjectKey={Boolean(project.projectSecret)} />
        </CardContent>
      </Card>

      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="p-0">
          <CardTitle className="font-headline text-2xl"><span className="mr-2">3.</span>Server Address</CardTitle>
          <CardDescription>
            Add the IP address or IP addresses of the server for this project in CSV format.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <ServerAddressForm projectId={project.id} initialIpAddress={project.ipAddress ?? ''} />
        </CardContent>
      </Card>

      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="p-0">
          <CardTitle className="font-headline text-2xl"><span className="mr-2">4.</span>Setup to configure Snippet</CardTitle>
          <CardDescription>
            Add this script to the target site for the selected project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-0 pt-4">
          <NextJsSetupGuidelines projectId={project.id} />
        </CardContent>
      </Card>

      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="p-0">
          <CardTitle className="font-headline text-2xl"><span className="mr-2">5.</span>Complete setup</CardTitle>
          <CardDescription>Your project configuration is ready. Add the credentials and snippet to your application to start collecting analytics.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <LinkButton variant="solid" href={`${makeAppPath('/activity')}?selectedProject=${encodeURIComponent(project.id)}`}>
            View Activities
          </LinkButton>
        </CardContent>
      </Card>

    </div>
  );
}
