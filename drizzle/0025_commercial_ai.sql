CREATE TABLE IF NOT EXISTS "ai_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "capability_id" text NOT NULL,
  "provider" text,
  "model" text,
  "prompt_template_version" text NOT NULL,
  "response_schema_version" text NOT NULL,
  "actor_email" text,
  "service" text,
  "content_hash" text NOT NULL,
  "selected_source_ids" jsonb NOT NULL,
  "status" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "error" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "ai_runs_idempotency_unique" UNIQUE ("organization_id", "idempotency_key"),
  CONSTRAINT "ai_runs_capability_valid" CHECK ("capability_id" IN ('AI-016', 'AI-018')),
  CONSTRAINT "ai_runs_status_valid" CHECK ("status" IN ('completed', 'failed'))
);

CREATE TABLE IF NOT EXISTS "ai_proposals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "run_id" uuid NOT NULL,
  "opportunity_id" uuid NOT NULL,
  "content_hash" text NOT NULL,
  "output" jsonb NOT NULL,
  "status" text DEFAULT 'proposed' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "ai_proposals_run_unique" UNIQUE ("run_id"),
  CONSTRAINT "ai_proposals_status_valid" CHECK ("status" IN ('proposed', 'dismissed', 'applied'))
);

CREATE TABLE IF NOT EXISTS "ai_citations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "proposal_id" uuid NOT NULL,
  "item_path" text NOT NULL,
  "document_version_id" uuid NOT NULL,
  "chunk_id" uuid NOT NULL,
  "content_hash" text NOT NULL,
  "page_number" integer NOT NULL,
  "start_offset" integer NOT NULL,
  "end_offset" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "ai_tool_executions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "run_id" uuid NOT NULL,
  "tool_name" text NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ai_proposals" ADD CONSTRAINT "ai_proposals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ai_proposals" ADD CONSTRAINT "ai_proposals_run_id_ai_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ai_proposals" ADD CONSTRAINT "ai_proposals_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ai_citations" ADD CONSTRAINT "ai_citations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ai_citations" ADD CONSTRAINT "ai_citations_proposal_id_ai_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."ai_proposals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ai_citations" ADD CONSTRAINT "ai_citations_document_version_id_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ai_citations" ADD CONSTRAINT "ai_citations_chunk_id_document_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."document_chunks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ai_tool_executions" ADD CONSTRAINT "ai_tool_executions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ai_tool_executions" ADD CONSTRAINT "ai_tool_executions_run_id_ai_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "ai_runs_organization_idx" ON "ai_runs" ("organization_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_proposals_opportunity_idx" ON "ai_proposals" ("organization_id", "opportunity_id");
CREATE INDEX IF NOT EXISTS "ai_citations_proposal_idx" ON "ai_citations" ("organization_id", "proposal_id");
CREATE INDEX IF NOT EXISTS "ai_tool_executions_run_idx" ON "ai_tool_executions" ("organization_id", "run_id");

CREATE OR REPLACE FUNCTION "ai_proposals_output_immutable"() RETURNS trigger AS $$
BEGIN
  IF NEW.output IS DISTINCT FROM OLD.output OR NEW.content_hash IS DISTINCT FROM OLD.content_hash THEN
    RAISE EXCEPTION 'ai proposal output is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "ai_proposals_output_immutable_trigger" ON "ai_proposals";
CREATE TRIGGER "ai_proposals_output_immutable_trigger"
  BEFORE UPDATE ON "ai_proposals"
  FOR EACH ROW EXECUTE FUNCTION "ai_proposals_output_immutable"();
