import Link from 'next/link';
import { Plus, Box, Activity } from 'lucide-react';
import { prisma } from '@/core/database/prisma';

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: {
      createdOn: 'desc',
    },
  });

  return (
    <main className="flex-1 bg-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-6">
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

          <Link
            href="/projects/create"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600"
          >
            <Plus className="h-4 w-4" />
            Create project
          </Link>
        </div>

        {/* Total Projects */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Total Projects
              </p>

              <p className="mt-3 text-3xl font-bold text-slate-950">
                {projects.length}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Registered Analytics Projects
              </p>
            </div>

            <div className="rounded-lg p-1 text-slate-400">
              <Box className="h-5 w-5" />
            </div>
          </div>
        </div>

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
          <div className="grid gap-5 md:grid-cols-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                {/* Project heading */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold text-slate-950">
                      {project.path}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Created on{' '}
                      {new Intl.DateTimeFormat('en-US', {
                        month: 'numeric',
                        day: 'numeric',
                        year: 'numeric',
                      }).format(new Date(project.createdOn))}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {project.type}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-7 space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Path
                    </p>

                    <p className="mt-1 break-all text-sm text-slate-500">
                      {project.path}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      More details
                    </p>

                    <p className="mt-1 break-all text-sm text-slate-500">
                      {project.moreDetails
                        ? typeof project.moreDetails === 'string'
                          ? project.moreDetails
                          : JSON.stringify(project.moreDetails)
                        : '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Token
                    </p>

                    <p className="mt-1 break-all font-mono text-xs text-slate-500">
                      {project.token}
                    </p>
                  </div>
                </div>

                {/* Activity */}
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <Link
                    href={`/activity?selectedProject=${encodeURIComponent(project.id)}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    <Activity className="h-4 w-4" />
                    View Activity
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}