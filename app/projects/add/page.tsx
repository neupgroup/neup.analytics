import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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

              <input
                id="path"
                name="path"
                type="text"
                placeholder="example.com"
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="type"
                className="text-sm font-medium"
              >
                Type
              </label>

              <input
                id="type"
                name="type"
                type="text"
                placeholder="website"
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="moreDetails"
                className="text-sm font-medium"
              >
                More details
              </label>

              <textarea
                id="moreDetails"
                name="moreDetails"
                placeholder="Additional project details"
                rows={4}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex gap-3">
              <Button type="button">
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </Button>

              <Button asChild variant="outline">
                <Link href="/projects">
                  Cancel
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
