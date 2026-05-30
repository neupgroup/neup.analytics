-- CreateTable
CREATE TABLE "snapshotWeb" (
    "id" TEXT NOT NULL,
    "session_id" TEXT,
    "pageUrl" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "details" JSONB,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "snapshotWeb_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "snapshotWeb_created_on_idx" ON "snapshotWeb"("created_on");

-- CreateIndex
CREATE INDEX "snapshotWeb_pageUrl_idx" ON "snapshotWeb"("pageUrl");

-- CreateIndex
CREATE INDEX "snapshotWeb_session_id_idx" ON "snapshotWeb"("session_id");

-- AddForeignKey
ALTER TABLE "snapshotWeb" ADD CONSTRAINT "snapshotWeb_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Interaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
