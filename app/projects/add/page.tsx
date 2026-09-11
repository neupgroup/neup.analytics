import { LinkButton } from '@neup/components/ui/link-button';
import { Plus } from 'lucide-react';
import { Button } from '@neup/components/ui/button';
import { Input } from '@neup/components/ui/input';
import { Textarea } from '@neup/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@neup/components/ui/card';

export default function AddProjectPage() {
  return (
    <div className="space-y-8">
      <div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Add Project
          </h1>

          <p className="mt-2 text-muted-foreground">
            Add a project to Analytics.
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Project</CardTitle>

          <CardDescription>
            This is a sample project interface. The project flow will be
            connected after the next step is defined.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="path"
                className="text-sm font-medium"
              >
                Path
              </label>

              <Input
                id="path"
                name="path"
                type="text"
                placeholder="example.com"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="type"
                className="text-sm font-medium"
              >
                Type
              </label>

              <Input
                id="type"
                name="type"
                type="text"
                placeholder="website"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="moreDetails"
                className="text-sm font-medium"
              >
                More details
              </label>

              <Textarea
                id="moreDetails"
                name="moreDetails"
                placeholder="Additional project details"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button htmlType="button" variant="solid">
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </Button>

              <LinkButton variant="tinted" href="/projects">
                  Cancel
                </LinkButton>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
