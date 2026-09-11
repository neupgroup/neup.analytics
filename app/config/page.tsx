import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Code2, Globe, KeyRound, Settings2, Waypoints } from 'lucide-react';
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

type ConfigPageProps = {
  searchParams?: Promise<{
    selectedProject?: string;
  }>;
};

async function getScriptUrls(projectId: string) {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') || 'https';
  const sdkPath = '/bridge/sdk.v1/record';

  if (!host) {
    return {
      sdkUrl: makeAppPath(sdkPath),
      activityEndpoint: `/bridge/webhook.v1/activity?project=${encodeURIComponent(projectId)}`,
    };
  }

  const origin = `${protocol}://${host}`;

  return {
    sdkUrl: `${origin}${makeAppPath(sdkPath)}`,
    activityEndpoint: `${origin}${makeAppPath(`/bridge/webhook.v1/activity?project=${encodeURIComponent(projectId)}`)}`,
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
    <div className="space-y-8">
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

      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-2xl">
            <Globe className="h-5 w-5 text-primary" />
            Install snippet
          </CardTitle>
          <CardDescription>
            Add this script to the target site for the selected project. It keeps the SDK auto-capture layer active for page views and outbound requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-muted/20 p-4">
            <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-muted-foreground">
              {snippet}
            </pre>
          </div>
          <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
            <div className="rounded-lg border bg-background p-4">
              `pageview` records which page the visitor opened.
            </div>
            <div className="rounded-lg border bg-background p-4">
              `requests` records browser fetch and XHR calls made during the session.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-2xl">
            <KeyRound className="h-5 w-5 text-primary" />
            Project credentials
          </CardTitle>
          <CardDescription>
            Generate an Ed25519 private key for authenticated analytics requests. The private key is generated locally and is never saved here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectKeyGenerator projectId={project.id} />
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Project details</CardTitle>
          <CardDescription>
            This config stays tied to the current `selectedProject`.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">Project ID:</span> {project.id}</p>
          <p><span className="font-medium text-foreground">Path:</span> {project.path}</p>
          <p><span className="font-medium text-foreground">Created:</span> {project.createdOn.toLocaleString()}</p>
        </CardContent>
      </Card>
    </div>
  );
}
