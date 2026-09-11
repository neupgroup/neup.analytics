-- Store the server IP address or comma-separated IP addresses for a project.
ALTER TABLE "Project" ADD COLUMN "ipAddress" VARCHAR(48);
