CREATE TABLE "schedule_calendars" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text NOT NULL,
  "name" text NOT NULL,
  "time_zone" text NOT NULL,
  "weekend_days" integer[] DEFAULT '{0,6}' NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL
);

CREATE TABLE "schedule_calendar_exceptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" text NOT NULL,
  "calendar_id" uuid NOT NULL
    REFERENCES "schedule_calendars"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "name" text NOT NULL,
  "is_working_day" boolean DEFAULT false NOT NULL,
  CONSTRAINT "schedule_calendar_exceptions_calendar_date_unique"
    UNIQUE ("calendar_id", "date")
);

CREATE INDEX "schedule_calendar_exceptions_calendar_idx"
  ON "schedule_calendar_exceptions" ("calendar_id");

ALTER TABLE "projects"
  ADD COLUMN "schedule_calendar_id" uuid
  REFERENCES "schedule_calendars"("id");

CREATE TABLE "project_schedule_baselines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL
    REFERENCES "projects"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "captured_at" timestamptz DEFAULT now() NOT NULL,
  "captured_by" text NOT NULL,
  "deleted_at" timestamptz,
  "deleted_by" text
);

CREATE INDEX "project_schedule_baselines_project_idx"
  ON "project_schedule_baselines" ("project_id");

CREATE TABLE "project_schedule_baseline_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "baseline_id" uuid NOT NULL
    REFERENCES "project_schedule_baselines"("id") ON DELETE CASCADE,
  "entity_type" text NOT NULL
    CHECK ("entity_type" IN ('job', 'task')),
  "entity_id" uuid NOT NULL,
  "planned_start_at" timestamptz,
  "planned_end_at" timestamptz,
  "due_at" timestamptz,
  CONSTRAINT "project_schedule_baseline_items_entity_unique"
    UNIQUE ("baseline_id", "entity_type", "entity_id")
);

CREATE INDEX "project_schedule_baseline_items_baseline_idx"
  ON "project_schedule_baseline_items" ("baseline_id");
