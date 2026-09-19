CREATE TABLE IF NOT EXISTS "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE
);

INSERT INTO "organizations" ("id", "name", "slug")
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Strong Foam Insulation Inc.',
  'strong-foam'
)
ON CONFLICT ("slug") DO NOTHING;

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "email" text NOT NULL UNIQUE,
  "display_name" text NOT NULL,
  "password_hash" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_by" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "memberships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  CONSTRAINT "memberships_organization_user_unique"
    UNIQUE ("organization_id", "user_id"),
  CONSTRAINT "memberships_role_valid"
    CHECK ("role" IN ('administrator', 'office', 'field_lead', 'field_worker'))
);

CREATE INDEX IF NOT EXISTS "memberships_user_idx" ON "memberships" ("user_id");

CREATE TABLE IF NOT EXISTS "job_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "job_id" uuid NOT NULL REFERENCES "jobs"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "role" text NOT NULL,
  "created_by" text NOT NULL,
  CONSTRAINT "job_assignments_job_user_unique" UNIQUE ("job_id", "user_id"),
  CONSTRAINT "job_assignments_role_valid"
    CHECK ("role" IN ('foreman', 'technician'))
);

CREATE INDEX IF NOT EXISTS "job_assignments_user_idx" ON "job_assignments" ("user_id");
CREATE INDEX IF NOT EXISTS "job_assignments_job_idx" ON "job_assignments" ("job_id");

ALTER TABLE "job_tasks"
  ADD COLUMN IF NOT EXISTS "assignee_user_id" uuid REFERENCES "users"("id");

CREATE INDEX IF NOT EXISTS "job_tasks_assignee_user_idx"
  ON "job_tasks" ("assignee_user_id");
