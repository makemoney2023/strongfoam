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

CREATE TABLE IF NOT EXISTS "proposals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "estimate_id" uuid NOT NULL,
  "estimate_version_id" uuid NOT NULL,
  "version_number" integer NOT NULL,
  "content_hash" text NOT NULL,
  "pdf_sha256" text NOT NULL,
  "pdf_base64" text NOT NULL,
  "token_hash" text NOT NULL,
  "public_snapshot" jsonb NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "proposals_token_hash_unique" UNIQUE ("token_hash")
);

CREATE TABLE IF NOT EXISTS "proposal_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "proposal_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "actor_email" text,
  "recipient_name" text,
  "recipient_email" text,
  "channel" text,
  "external_message_id" text,
  "attestation" text,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "proposal_events_kind_valid" CHECK (
    "kind" IN ('generated', 'delivered', 'viewed', 'accepted', 'rejected', 'expired', 'revoked')
  )
);

CREATE TABLE IF NOT EXISTS "estimate_acceptances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "proposal_id" uuid NOT NULL,
  "estimate_id" uuid NOT NULL,
  "estimate_version_id" uuid NOT NULL,
  "content_hash" text NOT NULL,
  "recipient_name" text NOT NULL,
  "recipient_email" text NOT NULL,
  "attestation" text NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "estimate_acceptances_proposal_unique" UNIQUE ("proposal_id")
);

DO $$ BEGIN
  ALTER TABLE "proposals"
    ADD CONSTRAINT "proposals_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "proposals"
    ADD CONSTRAINT "proposals_estimate_id_estimates_id_fk"
    FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "proposals"
    ADD CONSTRAINT "proposals_estimate_version_id_estimate_versions_id_fk"
    FOREIGN KEY ("estimate_version_id") REFERENCES "public"."estimate_versions"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "proposal_events"
    ADD CONSTRAINT "proposal_events_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "proposal_events"
    ADD CONSTRAINT "proposal_events_proposal_id_proposals_id_fk"
    FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_acceptances"
    ADD CONSTRAINT "estimate_acceptances_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_acceptances"
    ADD CONSTRAINT "estimate_acceptances_proposal_id_proposals_id_fk"
    FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_acceptances"
    ADD CONSTRAINT "estimate_acceptances_estimate_id_estimates_id_fk"
    FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "estimate_acceptances"
    ADD CONSTRAINT "estimate_acceptances_estimate_version_id_estimate_versions_id_fk"
    FOREIGN KEY ("estimate_version_id") REFERENCES "public"."estimate_versions"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "proposals_estimate_idx"
  ON "proposals" ("organization_id", "estimate_id");

CREATE INDEX IF NOT EXISTS "proposal_events_proposal_idx"
  ON "proposal_events" ("organization_id", "proposal_id");

CREATE INDEX IF NOT EXISTS "estimate_acceptances_estimate_idx"
  ON "estimate_acceptances" ("organization_id", "estimate_id");

CREATE OR REPLACE FUNCTION proposals_reject_mutation()
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

DROP TRIGGER IF EXISTS proposals_reject_mutation ON proposals;
CREATE TRIGGER proposals_reject_mutation
  BEFORE UPDATE OR DELETE ON proposals
  FOR EACH ROW EXECUTE FUNCTION proposals_reject_mutation();

DROP TRIGGER IF EXISTS proposal_events_reject_mutation ON proposal_events;
CREATE TRIGGER proposal_events_reject_mutation
  BEFORE UPDATE OR DELETE ON proposal_events
  FOR EACH ROW EXECUTE FUNCTION proposals_reject_mutation();

DROP TRIGGER IF EXISTS estimate_acceptances_reject_mutation ON estimate_acceptances;
CREATE TRIGGER estimate_acceptances_reject_mutation
  BEFORE UPDATE OR DELETE ON estimate_acceptances
  FOR EACH ROW EXECUTE FUNCTION proposals_reject_mutation();
