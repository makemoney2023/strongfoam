CREATE TABLE IF NOT EXISTS "work_areas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "job_id" uuid NOT NULL REFERENCES "jobs"("id"),
  "name" text NOT NULL,
  "kind" text DEFAULT 'area' NOT NULL,
  "notes" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "work_areas_id_job_id_unique" UNIQUE ("id", "job_id")
);

CREATE TABLE IF NOT EXISTS "job_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "job_id" uuid NOT NULL REFERENCES "jobs"("id"),
  "work_area_id" uuid,
  "title" text NOT NULL,
  "assignee" text,
  "due_at" timestamptz,
  "status" text DEFAULT 'open' NOT NULL,
  "created_by" text NOT NULL,
  CONSTRAINT "job_tasks_work_area_job_fk"
    FOREIGN KEY ("work_area_id", "job_id")
    REFERENCES "work_areas"("id", "job_id")
);

CREATE TABLE IF NOT EXISTS "job_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "job_id" uuid NOT NULL REFERENCES "jobs"("id"),
  "work_area_id" uuid,
  "filename" text NOT NULL,
  "content_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "pathname" text NOT NULL UNIQUE,
  "storage" text DEFAULT 'blob' NOT NULL,
  "kind" text DEFAULT 'plan' NOT NULL,
  "uploaded_by" text NOT NULL,
  CONSTRAINT "job_documents_work_area_job_fk"
    FOREIGN KEY ("work_area_id", "job_id")
    REFERENCES "work_areas"("id", "job_id")
);

CREATE INDEX IF NOT EXISTS "work_areas_job_id_idx" ON "work_areas" ("job_id");
CREATE INDEX IF NOT EXISTS "job_tasks_job_id_idx" ON "job_tasks" ("job_id");
CREATE INDEX IF NOT EXISTS "job_documents_job_id_idx" ON "job_documents" ("job_id");
