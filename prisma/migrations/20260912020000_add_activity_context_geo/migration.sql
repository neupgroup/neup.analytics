ALTER TABLE "Activity" ADD COLUMN "contextId" TEXT;
ALTER TABLE "Activity" ADD COLUMN "geoLocation" TEXT;
CREATE INDEX "Activity_contextId_idx" ON "Activity"("contextId");
