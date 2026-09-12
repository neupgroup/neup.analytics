-- Asymmetric public keys cannot be converted to HMAC secrets. Generate new project keys.
ALTER TABLE "Project" ADD COLUMN "projectSecret" TEXT;
ALTER TABLE "Project" DROP COLUMN "verifierKey";
