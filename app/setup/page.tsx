import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function SetupPage() {
  return (
    <div className="space-y-8">
      <div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Setup
          </h1>

          <p className="mt-2 text-muted-foreground">
            Configure Analytics for a project.
          </p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Analytics Setup</CardTitle>

          <CardDescription>
            This is a sample setup page. The actual setup flow will be
            defined later.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Settings className="mx-auto h-10 w-10 text-muted-foreground" />

            <h2 className="mt-4 text-lg font-semibold">
              Setup
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Project configuration and Analytics setup will be connected
              here.
            </p>

            <Button className="mt-5" type="button">
              Continue Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
