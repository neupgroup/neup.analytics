-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "pageName" VARCHAR(48) NOT NULL,
    "description" VARCHAR(128) NOT NULL,
    "iteration" VARCHAR(8) NOT NULL,
    "projectId" TEXT NOT NULL,
    "moreDetails" JSONB,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pages_projectId_idx" ON "pages"("projectId");

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
