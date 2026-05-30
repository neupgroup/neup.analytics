-- CreateEnum
CREATE TYPE "InteractionEventType" AS ENUM ('mousemove', 'click', 'scroll', 'touch', 'input', 'keydown');

-- CreateTable
CREATE TABLE "PageSnapshot" (
    "id" TEXT NOT NULL,
    "pagePath" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "recordedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeen" TIMESTAMP(3),
    "pagePath" TEXT,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "lastInteraction" JSONB,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "pageId" TEXT,
    "pagePath" TEXT NOT NULL,
    "windowWidth" INTEGER NOT NULL,
    "windowHeight" INTEGER NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteractionEvent" (
    "id" TEXT NOT NULL,
    "interactionId" TEXT NOT NULL,
    "type" "InteractionEventType" NOT NULL,
    "x" INTEGER,
    "y" INTEGER,
    "scrollX" INTEGER,
    "scrollY" INTEGER,
    "element" TEXT,
    "value" TEXT,
    "key" TEXT,
    "timestamp" INTEGER NOT NULL,

    CONSTRAINT "InteractionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sites" TEXT[],
    "details" TEXT,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageSnapshot_pagePath_idx" ON "PageSnapshot"("pagePath");

-- CreateIndex
CREATE INDEX "PageSnapshot_siteId_idx" ON "PageSnapshot"("siteId");

-- CreateIndex
CREATE INDEX "User_isLive_idx" ON "User"("isLive");

-- CreateIndex
CREATE INDEX "Interaction_createdAt_idx" ON "Interaction"("createdAt");

-- CreateIndex
CREATE INDEX "Interaction_pageId_idx" ON "Interaction"("pageId");

-- CreateIndex
CREATE INDEX "Interaction_userId_idx" ON "Interaction"("userId");

-- CreateIndex
CREATE INDEX "InteractionEvent_interactionId_idx" ON "InteractionEvent"("interactionId");

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "PageSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteractionEvent" ADD CONSTRAINT "InteractionEvent_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;