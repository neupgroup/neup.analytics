import { redirect } from 'next/navigation';
import { prisma } from '@neup/core/database/prisma';
import { Button } from '@neup/components/ui/button';
import { Input } from '@neup/components/ui/input';
import { Textarea } from '@neup/components/ui/textarea';
import { LinkButton } from '@neup/components/ui/link-button';
import { PagePathInput } from '@/components/page-path-input';

type PageAddProps = {
  searchParams?: Promise<{ page?: string; selectedProject?: string; error?: string }>;
};

function belongsToProject(value: string, projectPath: string) {
  if (value.startsWith('/')) return true;

  try {
    const pageUrl = new URL(value.includes('://') ? value : `https://${value}`);
    const projectUrl = new URL(projectPath.includes('://') ? projectPath : `https://${projectPath}`);
    return pageUrl.hostname === projectUrl.hostname || pageUrl.hostname.endsWith(`.${projectUrl.hostname}`);
  } catch {
    return false;
  }
}

export default async function AddPage({ searchParams }: PageAddProps) {
  const params = await searchParams;
  const pageName = params?.page?.trim() ?? '';
  const selectedProject = params?.selectedProject?.trim() ?? '';
  const error = params?.error;
  const project = selectedProject
    ? await prisma.project.findUnique({ where: { id: selectedProject }, select: { path: true } })
    : null;

  async function createPage(formData: FormData) {
    'use server';

    const projectId = String(formData.get('projectId') ?? '').trim();
    const name = String(formData.get('pageName') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const iteration = String(formData.get('iteration') ?? '1').trim();
    const moreDetails = String(formData.get('moreDetails') ?? '').trim();

    if (!projectId || !name || !iteration) throw new Error('Project, page name, and iteration are required.');

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { path: true } });
    if (!project || !belongsToProject(name, project.path)) {
      redirect(`/pages/add?page=${encodeURIComponent(name)}&selectedProject=${encodeURIComponent(projectId)}&error=outside-project`);
    }

    await prisma.page.create({
      data: {
        projectId,
        pageName: name.slice(0, 48),
        description: description.slice(0, 128),
        iteration: iteration.slice(0, 8),
        ...(moreDetails ? { moreDetails } : {}),
      },
    });

    redirect(`/pages?selectedProject=${encodeURIComponent(projectId)}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold">Add page</h1>
        <p className="mt-2 text-muted-foreground">Add a page to the selected project.</p>
      </div>


      <form action={createPage} className="space-y-6">
        <input type="hidden" name="projectId" value={selectedProject} />
        <div className="space-y-2">
          <label htmlFor="pageName" className="text-sm font-medium">Page URL or path</label>
          <PagePathInput projectPath={project?.path ?? ''} defaultValue={pageName} serverError={error === 'outside-project'} />
        </div>
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">Description</label>
          <Textarea id="description" name="description" maxLength={128} rows={3} />
        </div>
        <div className="space-y-2">
          <label htmlFor="iteration" className="text-sm font-medium">Iteration</label>
          <Input id="iteration" name="iteration" defaultValue="1" maxLength={8} required />
        </div>
        <div className="space-y-2">
          <label htmlFor="moreDetails" className="text-sm font-medium">More details</label>
          <Textarea id="moreDetails" name="moreDetails" rows={4} />
        </div>
        <div className="flex gap-3">
          <Button htmlType="submit" variant="solid">Add page</Button>
          <LinkButton variant="tinted" href={`/pages?selectedProject=${encodeURIComponent(selectedProject)}`}>Cancel</LinkButton>
        </div>
      </form>
    </div>
  );
}
