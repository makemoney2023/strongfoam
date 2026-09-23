CREATE TABLE IF NOT EXISTS "purchase_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "job_id" uuid NOT NULL,
  "supplier" text NOT NULL,
  "note" text DEFAULT '' NOT NULL,
  "status" text NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "purchase_orders_status_valid" CHECK ("status" IN ('draft', 'ordered', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS "purchase_order_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "purchase_order_id" uuid NOT NULL,
  "material_request_id" uuid NOT NULL,
  "active_material_request_id" uuid,
  "description" text NOT NULL,
  "quantity" integer,
  "unit" text DEFAULT '' NOT NULL,
  "position" integer NOT NULL,
  CONSTRAINT "purchase_order_lines_order_request_unique" UNIQUE ("purchase_order_id", "material_request_id"),
  CONSTRAINT "purchase_order_lines_claim_valid" CHECK ("active_material_request_id" IS NULL OR "active_material_request_id" = "material_request_id"),
  CONSTRAINT "purchase_order_lines_unit_valid" CHECK ("unit" IN ('', 'board_feet', 'sq_ft', 'linear_ft', 'bags', 'hours'))
);

DO $$ BEGIN
  ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_material_request_id_job_field_notes_id_fk" FOREIGN KEY ("material_request_id") REFERENCES "public"."job_field_notes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "purchase_orders_job_idx" ON "purchase_orders" ("organization_id", "job_id");
CREATE INDEX IF NOT EXISTS "purchase_order_lines_order_idx" ON "purchase_order_lines" ("purchase_order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_order_lines_active_request_idx" ON "purchase_order_lines" ("organization_id", "active_material_request_id") WHERE "active_material_request_id" IS NOT NULL;
