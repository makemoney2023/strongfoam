CREATE TABLE IF NOT EXISTS "companies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "city" text,
  "province" text
);

CREATE TABLE IF NOT EXISTS "contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "company_id" uuid REFERENCES "companies"("id"),
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL,
  "role" text
);

CREATE TABLE IF NOT EXISTS "sites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "company_id" uuid REFERENCES "companies"("id"),
  "name" text NOT NULL,
  "city" text NOT NULL,
  "province" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "opportunities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "company_id" uuid REFERENCES "companies"("id"),
  "contact_id" uuid REFERENCES "contacts"("id"),
  "site_id" uuid REFERENCES "sites"("id"),
  "source_lead_id" uuid REFERENCES "leads"("id"),
  "name" text NOT NULL,
  "stage" text DEFAULT 'qualification' NOT NULL,
  "owner" text,
  "source" text,
  "services" text[] NOT NULL,
  "project_type" text
);

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "company_id" uuid;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "contact_id" uuid;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "site_id" uuid;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "opportunity_id" uuid;

CREATE INDEX IF NOT EXISTS "companies_name_idx" ON "companies" ("name");
CREATE INDEX IF NOT EXISTS "contacts_email_idx" ON "contacts" ("email");
CREATE INDEX IF NOT EXISTS "contacts_company_id_idx" ON "contacts" ("company_id");
CREATE INDEX IF NOT EXISTS "sites_company_id_idx" ON "sites" ("company_id");
CREATE INDEX IF NOT EXISTS "opportunities_company_id_idx" ON "opportunities" ("company_id");
CREATE INDEX IF NOT EXISTS "opportunities_source_lead_id_idx" ON "opportunities" ("source_lead_id");
CREATE INDEX IF NOT EXISTS "leads_opportunity_id_idx" ON "leads" ("opportunity_id");
