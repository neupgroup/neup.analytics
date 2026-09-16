import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";

import { prisma } from "@neup/core/database/prisma";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@neup/components/ui/card";

type UserActivityPageProps = {
  params: Promise<{
    identifier: string;
  }>;
  searchParams: Promise<{
    selectedProject?: string;
  }>;
};

export default async function UserActivityPage({
  params,
  searchParams,
}: UserActivityPageProps) {
  const { identifier } = await params;
  const { selectedProject } = await searchParams;

  const identifierId = decodeURIComponent(identifier);

  const activities = await prisma.activity.findMany({
    where: {
      identifierId,
      ...(selectedProject
        ? {
            projectId: selectedProject,
          }
        : {}),
    },
    orderBy: {
      activityOn: "desc",
    },
  });

  const usersUrl = selectedProject
    ? `/users?selectedProject=${encodeURIComponent(selectedProject)}`
    : "/users";

  return (
    <div className="space-y-4">
      <Link
        href={usersUrl}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Users
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">
            User Activity
          </CardTitle>

          <CardDescription>
            Activities recorded for this identifier.
          </CardDescription>

          <div className="pt-2">
            <p className="text-sm text-muted-foreground">
              Identifier
            </p>

            <p className="break-all font-medium">
              {identifierId}
            </p>
          </div>
        </CardHeader>

        <CardContent>
          {activities.length === 0 ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-center text-muted-foreground">
              <Users className="mb-4 h-16 w-16" />

              <h3 className="mb-2 text-xl font-bold font-headline">
                No Activity Found
              </h3>

              <p>
                No activities have been recorded for this identifier.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => {
                const activityUrl = selectedProject
                  ? `/activity/${encodeURIComponent(
                      activity.id,
                    )}?selectedProject=${encodeURIComponent(
                      selectedProject,
                    )}`
                  : `/activity/${encodeURIComponent(activity.id)}`;

                return (
                  <Link
                    key={activity.id}
                    href={activityUrl}
                    className="block"
                  >
                    <div className="rounded-lg border p-4 transition-colors hover:bg-muted/50">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {activity.type}
                          </p>

                          {activity.pageUrl && (
                            <p className="truncate text-sm text-muted-foreground">
                              {activity.pageUrl}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            {activity.duration !== null &&
                              activity.duration !== undefined && (
                                <span>
                                  Duration: {activity.duration}s
                                </span>
                              )}

                            {activity.timeSpent !== null &&
                              activity.timeSpent !== undefined && (
                                <span>
                                  Time spent: {activity.timeSpent}s
                                </span>
                              )}
                          </div>
                        </div>

                        <div className="shrink-0 text-right text-sm text-muted-foreground">
                          {activity.activityOn
                            ? new Date(
                                activity.activityOn,
                              ).toLocaleString()
                            : "No activity time"}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}