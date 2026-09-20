CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "identifierId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Session_projectId_fkey"
        FOREIGN KEY ("projectId")
        REFERENCES "Project"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX "Session_identifierId_idx"
    ON "Session"("identifierId");

CREATE INDEX "Session_projectId_idx"
    ON "Session"("projectId");

CREATE INDEX "Session_lastActivityAt_idx"
    ON "Session"("lastActivityAt");

CREATE INDEX "Session_startedAt_idx"
    ON "Session"("startedAt");
