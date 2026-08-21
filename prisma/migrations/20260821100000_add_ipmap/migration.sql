CREATE TABLE "ipmap" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "ipType" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "geoLocation" JSONB,
    "ipInfo" JSONB,
    "moreDetails" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ipmap_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ipmap_ipType_check" CHECK ("ipType" IN ('ip4', 'ip6', 'dev'))
);

CREATE INDEX "ipmap_ipAddress_idx" ON "ipmap"("ipAddress");
CREATE INDEX "ipmap_lastUpdated_idx" ON "ipmap"("lastUpdated");
