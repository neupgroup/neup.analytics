DROP INDEX IF EXISTS "Activity_sessionId_idx";

ALTER TABLE "Activity"
DROP COLUMN IF EXISTS "sessionId";
