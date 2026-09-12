ALTER TABLE "Activity" ADD COLUMN "traceId" TEXT;

CREATE TABLE "AnalyticsContext" (
    "id" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsContext_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnalyticsContext_contextId_key" ON "AnalyticsContext"("contextId");
CREATE INDEX "AnalyticsContext_projectId_idx" ON "AnalyticsContext"("projectId");
CREATE INDEX "AnalyticsContext_traceId_idx" ON "AnalyticsContext"("traceId");
ALTER TABLE "AnalyticsContext" ADD CONSTRAINT "AnalyticsContext_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
