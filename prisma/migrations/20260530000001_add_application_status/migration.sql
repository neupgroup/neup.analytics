-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('setup', 'active');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN "status" "ApplicationStatus" NOT NULL DEFAULT 'setup';
