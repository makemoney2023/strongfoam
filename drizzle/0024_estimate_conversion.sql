CREATE TABLE IF NOT EXISTS "estimate_conversions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "acceptance_id" uuid NOT NULL,
  "estimate_id" uuid NOT NULL,
  "estimate_version_id" uuid NOT NULL,
  "content_hash" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "payload_hash" text NOT NULL,
  "project_id" uuid NOT NULL,
  "job_ids" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "estimate_conversions_acceptance_unique" UNIQUE ("acceptance_id"),
  CONSTRAINT "estimate_conversions_idempotency_unique" UNIQUE ("organization_id", "idempotency_key")
);

CREATE TABLE IF NOT EXISTS "project_budgets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "estimate_version_id" uuid NOT NULL,
  "content_hash" text NOT NULL,
  "total_cents" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "project_budgets_project_unique" UNIQUE ("project_id")
);

CREATE TABLE IF NOT EXISTS "project_budget_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "budget_id" uuid NOT NULL,
  "estimate_line_id" uuid NOT NULL,
  "estimate_version_id" uuid NOT NULL,
  "price_book_version_id" uuid,
  "description" text NOT NULL,
  "amount_cents" integer NOT NULL,
  "sort_order" integer NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "estimate_conversions" ADD CONSTRAINT "estimate_conversions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "estimate_conversions" ADD CONSTRAINT "estimate_conversions_acceptance_id_estimate_acceptances_id_fk" FOREIGN KEY ("acceptance_id") REFERENCES "public"."estimate_acceptances"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "estimate_conversions" ADD CONSTRAINT "estimate_conversions_estimate_id_estimates_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "estimate_conversions" ADD CONSTRAINT "estimate_conversions_estimate_version_id_estimate_versions_id_fk" FOREIGN KEY ("estimate_version_id") REFERENCES "public"."estimate_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "estimate_conversions" ADD CONSTRAINT "estimate_conversions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "project_budgets" ADD CONSTRAINT "project_budgets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "project_budgets" ADD CONSTRAINT "project_budgets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "project_budgets" ADD CONSTRAINT "project_budgets_estimate_version_id_estimate_versions_id_fk" FOREIGN KEY ("estimate_version_id") REFERENCES "public"."estimate_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "project_budget_lines" ADD CONSTRAINT "project_budget_lines_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "project_budget_lines" ADD CONSTRAINT "project_budget_lines_budget_id_project_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."project_budgets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "project_budget_lines" ADD CONSTRAINT "project_budget_lines_estimate_line_id_estimate_lines_id_fk" FOREIGN KEY ("estimate_line_id") REFERENCES "public"."estimate_lines"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "project_budget_lines" ADD CONSTRAINT "project_budget_lines_estimate_version_id_estimate_versions_id_fk" FOREIGN KEY ("estimate_version_id") REFERENCES "public"."estimate_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "project_budget_lines" ADD CONSTRAINT "project_budget_lines_price_book_version_id_price_book_item_versions_id_fk" FOREIGN KEY ("price_book_version_id") REFERENCES "public"."price_book_item_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "estimate_conversions_estimate_idx" ON "estimate_conversions" ("organization_id", "estimate_id");
CREATE INDEX IF NOT EXISTS "project_budgets_organization_idx" ON "project_budgets" ("organization_id", "project_id");
CREATE INDEX IF NOT EXISTS "project_budget_lines_budget_idx" ON "project_budget_lines" ("organization_id", "budget_id");

CREATE OR REPLACE FUNCTION estimate_conversions_reject_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS estimate_conversions_reject_mutation ON estimate_conversions;
CREATE TRIGGER estimate_conversions_reject_mutation
  BEFORE UPDATE OR DELETE ON estimate_conversions
  FOR EACH ROW EXECUTE FUNCTION estimate_conversions_reject_mutation();

DROP TRIGGER IF EXISTS project_budgets_reject_mutation ON project_budgets;
CREATE TRIGGER project_budgets_reject_mutation
  BEFORE UPDATE OR DELETE ON project_budgets
  FOR EACH ROW EXECUTE FUNCTION estimate_conversions_reject_mutation();

DROP TRIGGER IF EXISTS project_budget_lines_reject_mutation ON project_budget_lines;
CREATE TRIGGER project_budget_lines_reject_mutation
  BEFORE UPDATE OR DELETE ON project_budget_lines
  FOR EACH ROW EXECUTE FUNCTION estimate_conversions_reject_mutation();
