import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import { Textarea } from "@/component/ui/textarea";

export default function CreateProjectPage() {
  async function createProject(formData: FormData) {
    "use server";

    const path = String(formData.get("path") ?? "").trim();
    const type = String(formData.get("type") ?? "").trim();
    const moreDetails = String(formData.get("moreDetails") ?? "").trim();

    if (!path || !type) {
      throw new Error("Path and type are required.");
    }

    await prisma.project.create({
      data: {
        path,
        type,
        ...(moreDetails ? { moreDetails } : {}),
        token: crypto.randomUUID().replace(/-/g, ""),
      },
    });

    redirect("/projects");
  }

  return (
    <div className="space-y-8">
      <div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create project
          </h1>

          <p className="mt-2 text-muted-foreground">
            Register a site or domain for Analytics data collection.
          </p>
        </div>
      </div>

      <form action={createProject} className="max-w-2xl space-y-6">
        <div className="space-y-2">
          <label htmlFor="path" className="text-sm font-medium">
            Path
          </label>

          <Input
            id="path"
            name="path"
            type="text"
            placeholder="example.com"
            validation="linkwithoutprotocol"
            required
          />

          <p className="text-sm text-muted-foreground">
            The site or domain for which Analytics data will be collected.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="type" className="text-sm font-medium">
            Type
          </label>

          <Input
            id="type"
            name="type"
            type="text"
            placeholder="website"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="moreDetails" className="text-sm font-medium">
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
          <Button type="submit" variant="primary">
            Create project
          </Button>

          <Button asChild variant="tertiary">
            <Link href="/projects">
              Cancel
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
