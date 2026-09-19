ALTER TABLE "job_tasks"
  ADD COLUMN IF NOT EXISTS "planned_start_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "planned_end_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "completed_at" timestamptz;

ALTER TABLE "job_tasks"
  ADD CONSTRAINT "job_tasks_planned_date_order"
  CHECK (
    "planned_start_at" IS NULL
    OR "planned_end_at" IS NULL
    OR "planned_end_at" >= "planned_start_at"
  );

CREATE INDEX IF NOT EXISTS "job_tasks_job_schedule_idx"
  ON "job_tasks" ("job_id", "planned_start_at", "planned_end_at");
