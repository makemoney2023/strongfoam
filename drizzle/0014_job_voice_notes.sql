CREATE TABLE IF NOT EXISTS "job_voice_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "job_id" uuid NOT NULL REFERENCES "jobs"("id"),
  "work_area_id" uuid,
  "task_id" uuid REFERENCES "job_tasks"("id"),
  "annotation_id" uuid REFERENCES "job_plan_annotations"("id") ON DELETE SET NULL,
  "document_id" uuid REFERENCES "job_documents"("id") ON DELETE SET NULL,
  "source" text DEFAULT 'job' NOT NULL,
  "filename" text NOT NULL,
  "content_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "pathname" text NOT NULL UNIQUE,
  "storage" text DEFAULT 'blob' NOT NULL,
  "duration_seconds" integer,
  "language" text DEFAULT 'en' NOT NULL,
  "provider" text,
  "model" text,
  "status" text DEFAULT 'queued' NOT NULL,
  "machine_transcript" text,
  "transcript" text,
  "confidence" double precision,
  "queued_at" timestamptz DEFAULT now() NOT NULL,
  "processing_started_at" timestamptz,
  "completed_at" timestamptz,
  "failed_at" timestamptz,
  "error" text,
  "consent_at" timestamptz NOT NULL,
  "created_by" text NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'job_voice_notes_work_area_job_fk'
  ) THEN
    ALTER TABLE "job_voice_notes"
      ADD CONSTRAINT "job_voice_notes_work_area_job_fk"
      FOREIGN KEY ("work_area_id", "job_id")
      REFERENCES "work_areas"("id", "job_id");
  END IF;
END
$$;

ALTER TABLE "job_voice_notes"
  ADD CONSTRAINT "job_voice_notes_source_valid"
  CHECK ("source" IN ('job', 'task', 'annotation', 'document', 'daily_report'));

ALTER TABLE "job_voice_notes"
  ADD CONSTRAINT "job_voice_notes_status_valid"
  CHECK ("status" IN ('uploading', 'queued', 'processing', 'completed', 'failed'));

ALTER TABLE "job_voice_notes"
  ADD CONSTRAINT "job_voice_notes_size_positive"
  CHECK ("size_bytes" > 0);

CREATE INDEX IF NOT EXISTS "job_voice_notes_job_created_idx"
  ON "job_voice_notes" ("job_id", "created_at");
