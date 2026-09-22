ALTER TABLE "job_tasks"
  ADD COLUMN IF NOT EXISTS "stated_quantity" integer,
  ADD COLUMN IF NOT EXISTS "stated_unit" text;

ALTER TABLE "job_tasks"
  DROP CONSTRAINT IF EXISTS "job_tasks_stated_quantity_valid";

ALTER TABLE "job_tasks"
  ADD CONSTRAINT "job_tasks_stated_quantity_valid"
  CHECK (
    (
      "stated_quantity" IS NULL
      AND "stated_unit" IS NULL
    )
    OR (
      "stated_quantity" > 0
      AND "stated_quantity" <= 1000000
      AND "stated_unit" IN ('bags', 'sq_ft')
    )
  );
