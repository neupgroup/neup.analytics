ALTER TABLE "Activity"
ADD COLUMN "type" TEXT,
ADD COLUMN "sessionId" TEXT,
ADD COLUMN "timeSpent" INTEGER,
ADD COLUMN "agent" JSONB,
ADD COLUMN "location" JSONB,
ADD COLUMN "moreDetails" JSONB;

ALTER TABLE "Activity"
ALTER COLUMN "pageUrl" DROP NOT NULL;

CREATE INDEX "Activity_type_idx" ON "Activity"("type");
CREATE INDEX "Activity_sessionId_idx" ON "Activity"("sessionId");
