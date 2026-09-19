ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "session_version" integer DEFAULT 1 NOT NULL;

CREATE TABLE IF NOT EXISTS "user_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "actor" text NOT NULL,
  "kind" text NOT NULL,
  "summary" text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_events_user_created_idx"
  ON "user_events" ("user_id", "created_at");
