'use client';

import { ArrowRight, Database, Globe, Layers3 } from 'lucide-react';
import { createApplication } from '@/actions/application';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/component/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/component/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/component/ui/textarea';

function EntryForm({
  mode,
  title,
  description,
  cta,
}: {
  mode: 'site' | 'application';
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <form action={createApplication} className="mt-6 grid gap-4">
      <input type="hidden" name="entryType" value={mode} />
      <div className="grid gap-2">
        <Label htmlFor={`${mode}-name`}>Name</Label>
        <Input id={`${mode}-name`} name="name" placeholder={title} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${mode}-sites`}>Base paths</Label>
        <Textarea
          id={`${mode}-sites`}
          name="sites"
          rows={4}
          placeholder="https://example.com\nhttps://app.example.com"
          required
        />
        <p className="text-xs text-muted-foreground">
          Add one path per line or separate them with commas.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${mode}-details`}>Details</Label>
        <Textarea
          id={`${mode}-details`}
          name="details"
          rows={4}
          placeholder={description}
        />
      </div>
      <Button type="submit" variant="primary" className="w-full sm:w-fit">
        {cta}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </form>
  );
}

export function PropertyFormPage({
  saved,
}: {
  saved?: boolean;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Badge variant="secondary" className="w-fit">
          Workspace setup
        </Badge>
        <div className="space-y-2">
          <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
            Add site or application
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Register a new website base path or group multiple base paths into a
            single application record.
          </p>
        </div>
      </div>

      {saved && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
          Saved successfully. The new record is now stored in the Application table.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">
              Choose what you want to add
            </CardTitle>
            <CardDescription>
              Both options save into the same Application table with name, sites,
              and details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="site" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="site">Site</TabsTrigger>
                <TabsTrigger value="application">Application</TabsTrigger>
              </TabsList>

              <TabsContent value="site" className="mt-6 space-y-4">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">Site</p>
                      <p className="text-sm text-muted-foreground">
                        Track a single website or landing page.
                      </p>
                    </div>
                  </div>
                </div>
                <EntryForm
                  mode="site"
                  title="example.com"
                  description="Add owner, environment, or tracking notes here."
                  cta="Create site record"
                />
              </TabsContent>

              <TabsContent value="application" className="mt-6 space-y-4">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Layers3 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">Application</p>
                      <p className="text-sm text-muted-foreground">
                        Group several base paths under one application.
                      </p>
                    </div>
                  </div>
                </div>
                <EntryForm
                  mode="application"
                  title="Acme App"
                  description="Add team, rollout, or environment details here."
                  cta="Create application record"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/60 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="font-headline text-xl">
                Stored fields
              </CardTitle>
              <CardDescription>
                The Application table keeps the minimum record needed for setup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Database className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">id</p>
                  <p className="text-muted-foreground">Auto-generated unique identifier.</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="font-medium">name</p>
                <p className="text-muted-foreground">
                  The friendly name for the site or application.
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="font-medium">sites</p>
                <p className="text-muted-foreground">
                  One or more base paths stored as an array of strings.
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="font-medium">details</p>
                <p className="text-muted-foreground">
                  Optional notes for ownership, environment, or rollout context.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="font-headline text-xl">
                Base path format
              </CardTitle>
              <CardDescription>
                Use complete base URLs so the collector can match incoming traffic.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>https://example.com</p>
              <p>https://app.example.com</p>
              <p>https://www.example.com/blog</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
