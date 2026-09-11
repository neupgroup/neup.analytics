-- Add the Ed25519 public key used to verify project signatures.
ALTER TABLE "Project" ADD COLUMN "verifierKey" TEXT;
