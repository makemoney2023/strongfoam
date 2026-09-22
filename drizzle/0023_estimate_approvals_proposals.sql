CREATE TABLE IF NOT EXISTS "commercial_approval_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name" text NOT NULL,
  "active" boolean NOT NULL,
  "second_approver_total_cents" integer,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "estimate_approvals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "estimate_id" uuid NOT NULL,
  "estimate_version_id" uuid NOT NULL,
  "version_number" integer NOT NULL,
  "content_hash" text NOT NULL,
  "rule_id" uuid NOT NULL,
  "actor_email" text NOT NULL,
  "decision" text NOT NULL,
  "comment" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "estimate_approvals_actor_version_unique" UNIQUE ("estimate_version_id", "actor_email")
);

DO $$ BEGIN
  ALTER TABLE "commercial_approval_rules"
    ADD CONSTRAINT "commercial_approval_rules_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_approvals"
    ADD CONSTRAINT "estimate_approvals_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_approvals"
    ADD CONSTRAINT "estimate_approvals_estimate_id_estimates_id_fk"
    FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_approvals"
    ADD CONSTRAINT "estimate_approvals_estimate_version_id_estimate_versions_id_fk"
    FOREIGN KEY ("estimate_version_id") REFERENCES "public"."estimate_versions"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_approvals"
    ADD CONSTRAINT "estimate_approvals_rule_id_commercial_approval_rules_id_fk"
    FOREIGN KEY ("rule_id") REFERENCES "public"."commercial_approval_rules"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "estimate_approvals_estimate_idx"
  ON "estimate_approvals" ("organization_id", "estimate_id");

CREATE OR REPLACE FUNCTION estimate_approvals_reject_mutation()
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

DROP TRIGGER IF EXISTS estimate_approvals_reject_mutation ON estimate_approvals;
CREATE TRIGGER estimate_approvals_reject_mutation
  BEFORE UPDATE OR DELETE ON estimate_approvals
  FOR EACH ROW EXECUTE FUNCTION estimate_approvals_reject_mutation();
