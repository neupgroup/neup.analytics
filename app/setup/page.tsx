import Link from 'next/link';
import { Settings, ArrowLeft } from 'lucide-react';
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
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="mt-4">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <Settings className="h-3.5 w-3.5" />
            Setup
          </div>

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