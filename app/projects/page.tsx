import { Link } from '#/components/ui/link';
import { Plus, Box } from 'lucide-react';
import { prisma } from '#/core/database/prisma';
import { Skeleton } from '#/components/ui/skeleton';
import { Suspense } from 'react';

export function ProjectsSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading projects">
      <Skeleton className="h-[76px] w-full rounded-xl" />
      <div className="space-y-0">{[...Array(4)].map((_, index) => <div key={index} className="space-y-2 border border-slate-200 bg-white px-5 py-4"><Skeleton className="h-6 w-2/5" /><Skeleton className="h-4 w-1/3" /></div>)}</div>
    </div>
  );
}

type ProjectsPageProps = {
  searchParams?: Promise<{
    selectedProject?: string;
  }>;
};

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedProject = resolvedSearchParams?.selectedProject;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">Projects</h1>
        <p className="mt-2 text-sm text-slate-500">
          Projects represent the sites and domains for which Analytics data is collected.
        </p>
      </div>

      <Link
        href="/projects/create"
        className="flex min-h-[76px] w-full items-center rounded-xl border border-slate-200 bg-white px-5 py-4 transition-colors duration-200 ease-out hover:bg-sky-50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-full bg-sky-100 p-2 text-sky-600"><Plus className="h-4 w-4" /></div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-950">Create project</h2>
            <p className="mt-1 truncate text-sm text-slate-500">Add a new analytics project</p>
          </div>
        </div>
      </Link>

      <Suspense fallback={<ProjectsSkeleton />}>
        <ProjectsData selectedProject={selectedProject} />
      </Suspense>
    </div>
  );
}

async function ProjectsData({ selectedProject }: { selectedProject?: string }) {
  const projects = await prisma.project.findMany({
    orderBy: {
      createdOn: 'desc',
    },
  });

  function createProjectSelectionHref(projectId: string): string {
    const params = new URLSearchParams();
    params.set('selectedProject', projectId);
    return `/projects?${params.toString()}`;
  }

  return (
    <>
      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <Box className="mx-auto h-10 w-10 text-slate-300" />

          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            No projects yet
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Create your first Analytics project to get started.
          </p>

          <Link
            href="/projects/create"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600"
          >
            <Plus className="h-4 w-4" />
            Create project
          </Link>
        </div>
      ) : (
        <div className="space-y-0">
          {projects.map((project, index) => (
            <Link
              key={project.id}
              href={createProjectSelectionHref(project.id)}
              className={`flex min-h-[76px] w-full items-center border px-5 py-4 transition-colors duration-200 ease-out ${
                selectedProject === project.id
                  ? 'border-sky-200 bg-sky-100 hover:bg-sky-200'
                  : 'border-slate-200 bg-white hover:bg-sky-50'
              } ${
                index === 0 ? 'rounded-t-xl' : 'rounded-none border-t-0'
              } ${
                index === projects.length - 1 ? 'rounded-b-xl' : ''
              }`}
            >
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-slate-950">
                  {project.path}
                </h2>

                <p className="mt-1 truncate text-sm text-slate-500">
                  {project.path}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
