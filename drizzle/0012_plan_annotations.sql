ALTER TABLE "job_documents"
  ADD COLUMN IF NOT EXISTS "sheet_key" text DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS "version_number" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "replaces_document_id" uuid,
  ADD COLUMN IF NOT EXISTS "superseded_at" timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'job_documents_replaces_document_fk'
  ) THEN
    ALTER TABLE "job_documents"
      ADD CONSTRAINT "job_documents_replaces_document_fk"
      FOREIGN KEY ("replaces_document_id") REFERENCES "job_documents"("id");
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "job_plan_annotations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "job_id" uuid NOT NULL REFERENCES "jobs"("id"),
  "document_id" uuid NOT NULL REFERENCES "job_documents"("id"),
  "page_number" integer DEFAULT 1 NOT NULL,
  "x" double precision NOT NULL,
  "y" double precision NOT NULL,
  "kind" text DEFAULT 'pin' NOT NULL,
  "status" text DEFAULT 'planned' NOT NULL,
  "title" text NOT NULL,
  "body" text,
  "work_area_id" uuid,
  "task_id" uuid REFERENCES "job_tasks"("id"),
  "created_by" text NOT NULL,
  "completed_at" timestamptz,
  "completed_by" text,
  "voided_at" timestamptz,
  "voided_by" text
);

ALTER TABLE "job_field_notes"
  ADD COLUMN IF NOT EXISTS "annotation_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'job_field_notes_annotation_fk'
  ) THEN
    ALTER TABLE "job_field_notes"
      ADD CONSTRAINT "job_field_notes_annotation_fk"
      FOREIGN KEY ("annotation_id") REFERENCES "job_plan_annotations"("id");
  END IF;
END
$$;

ALTER TABLE "job_plan_annotations"
  ADD CONSTRAINT "job_plan_annotations_page_positive"
  CHECK ("page_number" >= 1);

ALTER TABLE "job_plan_annotations"
  ADD CONSTRAINT "job_plan_annotations_x_normalized"
  CHECK ("x" >= 0 AND "x" <= 1);

ALTER TABLE "job_plan_annotations"
  ADD CONSTRAINT "job_plan_annotations_y_normalized"
  CHECK ("y" >= 0 AND "y" <= 1);

ALTER TABLE "job_plan_annotations"
  ADD CONSTRAINT "job_plan_annotations_kind_valid"
  CHECK ("kind" IN ('pin'));

ALTER TABLE "job_plan_annotations"
  ADD CONSTRAINT "job_plan_annotations_status_valid"
  CHECK ("status" IN ('planned', 'in_progress', 'completed', 'blocked', 'deficiency'));

CREATE INDEX IF NOT EXISTS "job_plan_annotations_job_document_idx"
  ON "job_plan_annotations" ("job_id", "document_id");

CREATE INDEX IF NOT EXISTS "job_documents_job_current_plan_idx"
  ON "job_documents" ("job_id", "kind", "superseded_at");
