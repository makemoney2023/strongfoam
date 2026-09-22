CREATE TABLE IF NOT EXISTS "estimates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "opportunity_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "number" text NOT NULL,
  "title" text NOT NULL,
  "created_by" text NOT NULL,
  "current_version_id" uuid
);

CREATE TABLE IF NOT EXISTS "estimate_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "estimate_id" uuid NOT NULL,
  "version_number" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" text NOT NULL,
  "overhead_basis_points" integer NOT NULL,
  "markup_basis_points" integer NOT NULL,
  "tax_basis_points" integer NOT NULL,
  "calculation_order" text NOT NULL,
  "base_subtotal_cents" integer NOT NULL,
  "alternate_total_cents" integer NOT NULL,
  "overhead_cents" integer NOT NULL,
  "markup_cents" integer NOT NULL,
  "tax_cents" integer NOT NULL,
  "total_cents" integer NOT NULL,
  "content_hash" text NOT NULL,
  CONSTRAINT "estimate_versions_number_unique" UNIQUE ("estimate_id", "version_number")
);

CREATE TABLE IF NOT EXISTS "estimate_alternates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "estimate_version_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "included" boolean NOT NULL,
  "sort_order" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "estimate_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "estimate_version_id" uuid NOT NULL,
  "sort_order" integer NOT NULL,
  "category" text NOT NULL,
  "description" text NOT NULL,
  "trade" text NOT NULL,
  "location" text,
  "method" text NOT NULL,
  "quantity" numeric(14, 4),
  "unit" text,
  "unit_price_cents" integer,
  "basis_points" integer,
  "basis_categories" jsonb NOT NULL,
  "taxable" boolean NOT NULL,
  "alternate_id" uuid,
  "price_book_item_id" uuid,
  "price_book_version_id" uuid,
  "line_total_cents" integer NOT NULL,
  CONSTRAINT "estimate_lines_category_valid" CHECK (
    "category" IN ('labor', 'material', 'equipment', 'subcontractor', 'allowance')
  ),
  CONSTRAINT "estimate_lines_method_valid" CHECK ("method" IN ('unit', 'fixed', 'percent'))
);

CREATE TABLE IF NOT EXISTS "estimate_clauses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "estimate_version_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "text" text NOT NULL,
  "sort_order" integer NOT NULL,
  CONSTRAINT "estimate_clauses_kind_valid" CHECK (
    "kind" IN ('inclusion', 'exclusion', 'assumption')
  )
);

CREATE TABLE IF NOT EXISTS "estimate_job_packages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "estimate_version_id" uuid NOT NULL,
  "name" text NOT NULL,
  "trade" text NOT NULL,
  "scope" text NOT NULL,
  "sort_order" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "estimate_job_work_areas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "package_id" uuid NOT NULL,
  "name" text NOT NULL,
  "kind" text NOT NULL,
  "sort_order" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "estimate_job_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "package_id" uuid NOT NULL,
  "work_area_id" uuid,
  "title" text NOT NULL,
  "sort_order" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "estimate_line_sources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "line_id" uuid NOT NULL,
  "document_version_id" uuid NOT NULL,
  "page_number" integer NOT NULL,
  "sheet_label" text,
  "chunk_id" uuid NOT NULL,
  "content_hash" text NOT NULL,
  "start_offset" integer NOT NULL,
  "end_offset" integer NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "estimates"
    ADD CONSTRAINT "estimates_organization_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimates"
    ADD CONSTRAINT "estimates_opportunity_id_fk"
    FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimates"
    ADD CONSTRAINT "estimates_organization_number_unique" UNIQUE ("organization_id", "number");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_versions"
    ADD CONSTRAINT "estimate_versions_organization_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_versions"
    ADD CONSTRAINT "estimate_versions_estimate_id_fk"
    FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_alternates"
    ADD CONSTRAINT "estimate_alternates_organization_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_alternates"
    ADD CONSTRAINT "estimate_alternates_estimate_version_id_fk"
    FOREIGN KEY ("estimate_version_id") REFERENCES "estimate_versions"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_lines"
    ADD CONSTRAINT "estimate_lines_organization_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_lines"
    ADD CONSTRAINT "estimate_lines_estimate_version_id_fk"
    FOREIGN KEY ("estimate_version_id") REFERENCES "estimate_versions"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_lines"
    ADD CONSTRAINT "estimate_lines_alternate_id_fk"
    FOREIGN KEY ("alternate_id") REFERENCES "estimate_alternates"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_lines"
    ADD CONSTRAINT "estimate_lines_price_book_item_id_fk"
    FOREIGN KEY ("price_book_item_id") REFERENCES "price_book_items"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_lines"
    ADD CONSTRAINT "estimate_lines_price_book_version_id_fk"
    FOREIGN KEY ("price_book_version_id") REFERENCES "price_book_item_versions"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_clauses"
    ADD CONSTRAINT "estimate_clauses_organization_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_clauses"
    ADD CONSTRAINT "estimate_clauses_estimate_version_id_fk"
    FOREIGN KEY ("estimate_version_id") REFERENCES "estimate_versions"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_job_packages"
    ADD CONSTRAINT "estimate_job_packages_organization_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_job_packages"
    ADD CONSTRAINT "estimate_job_packages_estimate_version_id_fk"
    FOREIGN KEY ("estimate_version_id") REFERENCES "estimate_versions"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_job_work_areas"
    ADD CONSTRAINT "estimate_job_work_areas_organization_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_job_work_areas"
    ADD CONSTRAINT "estimate_job_work_areas_package_id_fk"
    FOREIGN KEY ("package_id") REFERENCES "estimate_job_packages"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_job_tasks"
    ADD CONSTRAINT "estimate_job_tasks_organization_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_job_tasks"
    ADD CONSTRAINT "estimate_job_tasks_package_id_fk"
    FOREIGN KEY ("package_id") REFERENCES "estimate_job_packages"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_job_tasks"
    ADD CONSTRAINT "estimate_job_tasks_work_area_id_fk"
    FOREIGN KEY ("work_area_id") REFERENCES "estimate_job_work_areas"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_line_sources"
    ADD CONSTRAINT "estimate_line_sources_organization_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_line_sources"
    ADD CONSTRAINT "estimate_line_sources_line_id_fk"
    FOREIGN KEY ("line_id") REFERENCES "estimate_lines"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_line_sources"
    ADD CONSTRAINT "estimate_line_sources_document_version_id_fk"
    FOREIGN KEY ("document_version_id") REFERENCES "document_versions"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_line_sources"
    ADD CONSTRAINT "estimate_line_sources_chunk_id_fk"
    FOREIGN KEY ("chunk_id") REFERENCES "document_chunks"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "estimates"
    ADD CONSTRAINT "estimates_current_version_id_fk"
    FOREIGN KEY ("current_version_id") REFERENCES "estimate_versions"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "estimates_opportunity_idx"
  ON "estimates" ("organization_id", "opportunity_id");
CREATE INDEX IF NOT EXISTS "estimate_versions_estimate_idx"
  ON "estimate_versions" ("organization_id", "estimate_id");
CREATE INDEX IF NOT EXISTS "estimate_alternates_version_idx"
  ON "estimate_alternates" ("organization_id", "estimate_version_id");
CREATE INDEX IF NOT EXISTS "estimate_lines_version_idx"
  ON "estimate_lines" ("organization_id", "estimate_version_id");
CREATE INDEX IF NOT EXISTS "estimate_clauses_version_idx"
  ON "estimate_clauses" ("organization_id", "estimate_version_id");
CREATE INDEX IF NOT EXISTS "estimate_job_packages_version_idx"
  ON "estimate_job_packages" ("organization_id", "estimate_version_id");
CREATE INDEX IF NOT EXISTS "estimate_job_work_areas_package_idx"
  ON "estimate_job_work_areas" ("organization_id", "package_id");
CREATE INDEX IF NOT EXISTS "estimate_job_tasks_package_idx"
  ON "estimate_job_tasks" ("organization_id", "package_id");
CREATE INDEX IF NOT EXISTS "estimate_line_sources_line_idx"
  ON "estimate_line_sources" ("organization_id", "line_id");

CREATE OR REPLACE FUNCTION estimate_content_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'immutable';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  content_table text;
BEGIN
  FOREACH content_table IN ARRAY ARRAY[
    'estimate_versions',
    'estimate_lines',
    'estimate_clauses',
    'estimate_alternates',
    'estimate_job_packages',
    'estimate_job_work_areas',
    'estimate_job_tasks',
    'estimate_line_sources'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS estimate_content_reject_mutation ON %I',
      content_table
    );
    EXECUTE format(
      'CREATE TRIGGER estimate_content_reject_mutation BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION estimate_content_reject_mutation()',
      content_table
    );
  END LOOP;
END $$;
