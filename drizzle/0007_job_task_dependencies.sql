CREATE TABLE "job_task_dependencies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "predecessor_task_id" uuid NOT NULL
    REFERENCES "job_tasks"("id") ON DELETE CASCADE,
  "successor_task_id" uuid NOT NULL
    REFERENCES "job_tasks"("id") ON DELETE CASCADE,
  "lag_days" integer DEFAULT 0 NOT NULL,
  "created_by" text NOT NULL,
  CONSTRAINT "job_task_dependencies_unique"
    UNIQUE ("predecessor_task_id", "successor_task_id"),
  CONSTRAINT "job_task_dependencies_no_self"
    CHECK ("predecessor_task_id" <> "successor_task_id"),
  CONSTRAINT "job_task_dependencies_lag_nonnegative"
    CHECK ("lag_days" >= 0)
);

CREATE INDEX "job_task_dependencies_project_idx"
  ON "job_task_dependencies" ("project_id");
CREATE INDEX "job_task_dependencies_successor_idx"
  ON "job_task_dependencies" ("successor_task_id");
