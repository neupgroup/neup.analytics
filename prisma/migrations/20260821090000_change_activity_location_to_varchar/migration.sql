ALTER TABLE "Activity"
ALTER COLUMN "location" TYPE VARCHAR(256)
USING (
  CASE
    WHEN "location" IS NULL THEN NULL
    WHEN jsonb_typeof("location") = 'string' THEN LEFT(TRIM(BOTH '"' FROM "location"::TEXT), 256)
    ELSE LEFT("location"::TEXT, 256)
  END
);

ALTER TABLE "Activity"
ALTER COLUMN "location" SET DEFAULT '';
