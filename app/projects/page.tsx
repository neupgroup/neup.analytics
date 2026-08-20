import Link from 'next/link';
import { Plus, Box } from 'lucide-react';
import { prisma } from '@/core/database/prisma';

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

  const projects = await prisma.project.findMany({
    orderBy: {
      createdOn: 'desc',
    },
  });

  return (
    <main className="flex-1 bg-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
        {/* Header */}
        <div className="mb-8">
          <div>
            <div className="mb-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Projects
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Projects
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Projects represent the sites and domains for which Analytics data
              is collected.
            </p>
          </div>
        </div>

        <Link
          href="/projects/create"
          className="mb-6 flex min-h-[76px] w-full items-center rounded-xl border border-slate-200 bg-white px-5 py-4 transition-colors duration-200 ease-out hover:bg-sky-50"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-full bg-sky-100 p-2 text-sky-600">
              <Plus className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-slate-950">
                Create project
              </h2>

              <p className="mt-1 truncate text-sm text-slate-500">
                Add a new analytics project
              </p>
            </div>
          </div>
        </Link>

        {/* Projects */}
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
                href={`/projects?selectedProject=${encodeURIComponent(project.id)}`}
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
      </div>
    </main>
  );
}
