CREATE TABLE IF NOT EXISTS "change_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "number" text NOT NULL,
  "scope" text NOT NULL,
  "price_cents" integer NOT NULL,
  "schedule_impact_days" integer NOT NULL,
  "status" text NOT NULL,
  "content_hash" text NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "change_orders_project_number_unique" UNIQUE ("project_id", "number"),
  CONSTRAINT "change_orders_status_valid" CHECK ("status" IN ('draft', 'pending', 'approved', 'rejected', 'void'))
);

CREATE TABLE IF NOT EXISTS "change_order_approvals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "change_order_id" uuid NOT NULL,
  "content_hash" text NOT NULL,
  "rule_id" uuid NOT NULL,
  "actor_email" text NOT NULL,
  "decision" text NOT NULL,
  "comment" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "change_order_approvals_actor_unique" UNIQUE ("change_order_id", "actor_email"),
  CONSTRAINT "change_order_approvals_decision_valid" CHECK ("decision" IN ('approved', 'rejected'))
);

CREATE TABLE IF NOT EXISTS "change_order_budget_effects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "change_order_id" uuid NOT NULL,
  "approval_id" uuid NOT NULL,
  "content_hash" text NOT NULL,
  "price_cents" integer NOT NULL,
  "schedule_impact_days" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "change_order_budget_effects_order_unique" UNIQUE ("change_order_id")
);

DO $$ BEGIN
  ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "change_order_approvals" ADD CONSTRAINT "change_order_approvals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "change_order_approvals" ADD CONSTRAINT "change_order_approvals_change_order_id_change_orders_id_fk" FOREIGN KEY ("change_order_id") REFERENCES "public"."change_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "change_order_approvals" ADD CONSTRAINT "change_order_approvals_rule_id_commercial_approval_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."commercial_approval_rules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "change_order_budget_effects" ADD CONSTRAINT "change_order_budget_effects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "change_order_budget_effects" ADD CONSTRAINT "change_order_budget_effects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "change_order_budget_effects" ADD CONSTRAINT "change_order_budget_effects_change_order_id_change_orders_id_fk" FOREIGN KEY ("change_order_id") REFERENCES "public"."change_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "change_order_budget_effects" ADD CONSTRAINT "change_order_budget_effects_approval_id_change_order_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."change_order_approvals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "change_orders_project_idx" ON "change_orders" ("organization_id", "project_id");
CREATE INDEX IF NOT EXISTS "change_order_approvals_order_idx" ON "change_order_approvals" ("organization_id", "change_order_id");
CREATE INDEX IF NOT EXISTS "change_order_budget_effects_project_idx" ON "change_order_budget_effects" ("organization_id", "project_id");
