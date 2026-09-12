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
    const pageTitle = String(formData.get('pageTitle') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();

    if (!projectId || !name || !pageTitle) throw new Error('Project, page path, and title are required.');

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { path: true } });
    if (!project || !belongsToProject(name, project.path)) {
      redirect(`/pages/add?page=${encodeURIComponent(name)}&selectedProject=${encodeURIComponent(projectId)}&error=outside-project`);
    }

    await prisma.page.create({
      data: {
        projectId,
        pageName: name.slice(0, 48),
        pageTitle: pageTitle.slice(0, 128),
        description: description.slice(0, 128),
        iteration: '1',
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
          <label htmlFor="pageTitle" className="text-sm font-medium">Page title</label>
          <Input id="pageTitle" name="pageTitle" maxLength={128} required />
        </div>
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">Description</label>
          <Textarea id="description" name="description" maxLength={128} rows={3} />
        </div>
        <div className="flex gap-3">
          <Button htmlType="submit" variant="solid">Add page</Button>
          <LinkButton variant="tinted" href={`/pages?selectedProject=${encodeURIComponent(selectedProject)}`}>Cancel</LinkButton>
        </div>
      </form>
    </div>
  );
}
