CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "identifierId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "pageUrl" TEXT NOT NULL,
    "referral" TEXT,
    "activityOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Activity_identifierId_idx" ON "Activity"("identifierId");

CREATE INDEX "Activity_activityOn_idx" ON "Activity"("activityOn");

CREATE INDEX "Activity_pageUrl_idx" ON "Activity"("pageUrl");