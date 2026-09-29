import Link from "next/link";

import {
  prisma,
  Prisma,
} from "@neup/core/database/prisma";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@neup/components/ui/card";

import { Users } from "lucide-react";

const PAGE_SIZE = 50;

type UsersPageProps = {
  searchParams: Promise<{
    selectedProject?: string;
    page?: string;
  }>;
};

export default async function UsersPage({
  searchParams,
}: UsersPageProps) {
  const { selectedProject, page: pageParam } = await searchParams;

  const parsedPage = Number.parseInt(pageParam ?? "1", 10);

  const currentPage =
    Number.isFinite(parsedPage) && parsedPage > 0
      ? parsedPage
      : 1;

  const where = selectedProject
    ? {
        projectId: selectedProject,
      }
    : undefined;

  const totalUsersResult = selectedProject
    ? await prisma.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`
          SELECT COUNT(DISTINCT "identifierId") AS count
          FROM "Activity"
          WHERE "projectId" = ${selectedProject}
        `,
      )
    : await prisma.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`
          SELECT COUNT(DISTINCT "identifierId") AS count
          FROM "Activity"
        `,
      );

  const totalUsers = Number(totalUsersResult[0]?.count ?? 0);

  const totalPages = Math.ceil(totalUsers / PAGE_SIZE);

  const page =
    totalPages === 0
      ? 1
      : Math.min(currentPage, totalPages);

  const createPageHref = (pageNumber: number) => {
    const params = new URLSearchParams();

    if (selectedProject) {
      params.set("selectedProject", selectedProject);
    }

    params.set("page", pageNumber.toString());

    return `/users?${params.toString()}`;
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      return Array.from(
        { length: totalPages },
        (_, index) => index + 1,
      );
    }

    pages.push(1);

    if (page > 4) {
      pages.push("ellipsis");
    }

    const startPage = Math.max(2, page - 2);
    const endPage = Math.min(
      totalPages - 1,
      page + 2,
    );

    for (
      let pageNumber = startPage;
      pageNumber <= endPage;
      pageNumber++
    ) {
      pages.push(pageNumber);
    }

    if (page < totalPages - 3) {
      pages.push("ellipsis");
    }

    pages.push(totalPages);

    return pages;
  };

  const users = await prisma.activity.groupBy({
    by: ["identifierId"],
    where,
    _max: {
      activityOn: true,
    },
    orderBy: {
      _max: {
        activityOn: "desc",
      },
    },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">
          Users
        </CardTitle>

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

            <p>
              No activity identifiers have been recorded yet.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {users.map((user) => {
                const href = selectedProject
                  ? `/users/${encodeURIComponent(
                      user.identifierId,
                    )}?selectedProject=${encodeURIComponent(
                      selectedProject,
                    )}`
                  : `/users/${encodeURIComponent(
                      user.identifierId,
                    )}`;

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
                            <p className="font-medium">
                              User
                            </p>

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

            {totalPages > 1 && (
              <>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  {page > 1 ? (
                    <Link
                      href={createPageHref(page - 1)}
                      className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
                    >
                      Previous
                    </Link>
                  ) : (
                    <span className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                      Previous
                    </span>
                  )}

                  {getPageNumbers().map(
                    (pageNumber, index) => {
                      if (pageNumber === "ellipsis") {
                        return (
                          <span
                            key={`ellipsis-${index}`}
                            className="px-2 py-2 text-sm text-muted-foreground"
                          >
                            ...
                          </span>
                        );
                      }

                      return (
                        <Link
                          key={pageNumber}
                          href={createPageHref(pageNumber)}
                          className={
                            pageNumber === page
                              ? "rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                              : "rounded-md border px-3 py-2 text-sm hover:bg-muted"
                          }
                        >
                          {pageNumber}
                        </Link>
                      );
                    },
                  )}

                  {page < totalPages ? (
                    <Link
                      href={createPageHref(page + 1)}
                      className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
                    >
                      Next
                    </Link>
                  ) : (
                    <span className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                      Next
                    </span>
                  )}
                </div>

                <form
                  method="GET"
                  className="mt-4 flex items-center justify-center gap-2"
                >
                  {selectedProject && (
                    <input
                      type="hidden"
                      name="selectedProject"
                      value={selectedProject}
                    />
                  )}

                  <label
                    htmlFor="page"
                    className="text-sm text-muted-foreground"
                  >
                    Go to page:
                  </label>

                  <input
                    id="page"
                    name="page"
                    type="number"
                    min={1}
                    max={totalPages}
                    defaultValue={page}
                    className="w-20 rounded-md border px-3 py-2 text-sm"
                  />

                  <button
                    type="submit"
                    className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
                  >
                    Go
                  </button>
                </form>

                <p className="mt-3 text-center text-sm text-muted-foreground">
                  Page {page} of {totalPages} ·{" "}
                  {totalUsers} users
                </p>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}