CREATE TABLE IF NOT EXISTS "job_field_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "job_id" uuid NOT NULL REFERENCES "jobs"("id"),
  "work_area_id" uuid,
  "task_id" uuid REFERENCES "job_tasks"("id"),
  "kind" text DEFAULT 'note' NOT NULL,
  "body" text NOT NULL,
  "quantity" integer,
  "unit" text,
  "created_by" text NOT NULL,
  CONSTRAINT "job_field_notes_work_area_job_fk"
    FOREIGN KEY ("work_area_id", "job_id")
    REFERENCES "work_areas"("id", "job_id")
);

CREATE INDEX IF NOT EXISTS "job_field_notes_job_id_idx" ON "job_field_notes" ("job_id");
CREATE INDEX IF NOT EXISTS "job_field_notes_kind_idx" ON "job_field_notes" ("kind");
