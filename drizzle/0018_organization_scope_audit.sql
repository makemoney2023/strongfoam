-- Organization scope on the commercial path, then append-only audit events.

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "job_documents" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "price_book_items" ADD COLUMN IF NOT EXISTS "organization_id" uuid;

UPDATE "leads"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'
WHERE "organization_id" IS NULL;
UPDATE "companies"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'
WHERE "organization_id" IS NULL;
UPDATE "contacts"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'
WHERE "organization_id" IS NULL;
UPDATE "sites"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'
WHERE "organization_id" IS NULL;
UPDATE "opportunities"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'
WHERE "organization_id" IS NULL;
UPDATE "projects"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'
WHERE "organization_id" IS NULL;
UPDATE "jobs"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'
WHERE "organization_id" IS NULL;
UPDATE "job_documents"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'
WHERE "organization_id" IS NULL;
UPDATE "price_book_items"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'
WHERE "organization_id" IS NULL;

ALTER TABLE "leads" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "companies" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "contacts" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "sites" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "opportunities" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "jobs" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "job_documents" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "price_book_items" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_organization_id_fk";
ALTER TABLE "leads"
  ADD CONSTRAINT "leads_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
ALTER TABLE "companies" DROP CONSTRAINT IF EXISTS "companies_organization_id_fk";
ALTER TABLE "companies"
  ADD CONSTRAINT "companies_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "contacts_organization_id_fk";
ALTER TABLE "contacts"
  ADD CONSTRAINT "contacts_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
ALTER TABLE "sites" DROP CONSTRAINT IF EXISTS "sites_organization_id_fk";
ALTER TABLE "sites"
  ADD CONSTRAINT "sites_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
ALTER TABLE "opportunities" DROP CONSTRAINT IF EXISTS "opportunities_organization_id_fk";
ALTER TABLE "opportunities"
  ADD CONSTRAINT "opportunities_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_organization_id_fk";
ALTER TABLE "projects"
  ADD CONSTRAINT "projects_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
ALTER TABLE "jobs" DROP CONSTRAINT IF EXISTS "jobs_organization_id_fk";
ALTER TABLE "jobs"
  ADD CONSTRAINT "jobs_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
ALTER TABLE "job_documents" DROP CONSTRAINT IF EXISTS "job_documents_organization_id_fk";
ALTER TABLE "job_documents"
  ADD CONSTRAINT "job_documents_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
ALTER TABLE "price_book_items" DROP CONSTRAINT IF EXISTS "price_book_items_organization_id_fk";
ALTER TABLE "price_book_items"
  ADD CONSTRAINT "price_book_items_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");

CREATE INDEX IF NOT EXISTS "leads_organization_idx" ON "leads" ("organization_id");
CREATE INDEX IF NOT EXISTS "companies_organization_idx" ON "companies" ("organization_id");
CREATE INDEX IF NOT EXISTS "contacts_organization_idx" ON "contacts" ("organization_id");
CREATE INDEX IF NOT EXISTS "sites_organization_idx" ON "sites" ("organization_id");
CREATE INDEX IF NOT EXISTS "opportunities_organization_idx" ON "opportunities" ("organization_id");
CREATE INDEX IF NOT EXISTS "projects_organization_idx" ON "projects" ("organization_id");
CREATE INDEX IF NOT EXISTS "jobs_organization_idx" ON "jobs" ("organization_id");
CREATE INDEX IF NOT EXISTS "job_documents_organization_idx" ON "job_documents" ("organization_id");
CREATE INDEX IF NOT EXISTS "price_book_items_organization_idx" ON "price_book_items" ("organization_id");

CREATE TABLE IF NOT EXISTS "audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "actor" text NOT NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "result" text NOT NULL,
  "correlation_id" uuid NOT NULL,
  "payload" jsonb NOT NULL,
  CONSTRAINT "audit_events_result_valid" CHECK (
    "result" IN ('success', 'denied', 'failure')
  )
);

CREATE INDEX IF NOT EXISTS "audit_events_organization_created_idx"
  ON "audit_events" ("organization_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_events_entity_idx"
  ON "audit_events" ("organization_id", "entity_type", "entity_id");

CREATE OR REPLACE FUNCTION "audit_events_reject_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS "audit_events_append_only" ON "audit_events";
CREATE TRIGGER "audit_events_append_only"
  BEFORE UPDATE OR DELETE ON "audit_events"
  FOR EACH ROW
  EXECUTE FUNCTION "audit_events_reject_mutation"();
