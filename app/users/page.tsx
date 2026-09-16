import Link from "next/link";

import { prisma } from "@neup/core/database/prisma";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@neup/components/ui/card";

import { Users } from "lucide-react";

type UsersPageProps = {
  searchParams: Promise<{
    selectedProject?: string;
  }>;
};

export default async function UsersPage({
  searchParams,
}: UsersPageProps) {
  const { selectedProject } = await searchParams;

  const users = await prisma.activity.groupBy({
    by: ["identifierId"],
    where: selectedProject
      ? {
          projectId: selectedProject,
        }
      : undefined,
    _max: {
      activityOn: true,
    },
    orderBy: {
      _max: {
        activityOn: "desc",
      },
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Users</CardTitle>
        <CardDescription>
          View users identified by their activity identifier.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {users.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-center text-muted-foreground">
            <Users className="mb-4 h-16 w-16" />

            <h3 className="mb-2 text-xl font-bold font-headline">
              No Users Found
            </h3>

            <p>No activity identifiers have been recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => {
              const href = selectedProject
                ? `/users/${encodeURIComponent(
                    user.identifierId,
                  )}?selectedProject=${encodeURIComponent(selectedProject)}`
                : `/users/${encodeURIComponent(user.identifierId)}`;

              return (
                <Link
                  key={user.identifierId}
                  href={href}
                  className="block"
                >
                  <div className="rounded-lg border p-4 transition-colors hover:bg-muted/50">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Users className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <p className="font-medium">User</p>

                          <p className="truncate text-sm text-muted-foreground">
                            {user.identifierId}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right text-sm text-muted-foreground">
                        {user._max.activityOn
                          ? new Date(
                              user._max.activityOn,
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
  );
}