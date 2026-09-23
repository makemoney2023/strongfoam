CREATE UNIQUE INDEX IF NOT EXISTS "production_targets_one_open"
  ON "production_targets" ("organization_id", "trade", "work_type", "unit", "basis")
  WHERE "effective_to" IS NULL;
