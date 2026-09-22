CREATE TABLE IF NOT EXISTS "documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "title" text NOT NULL,
  "created_by" text NOT NULL
);

CREATE INDEX IF NOT EXISTS "documents_organization_idx"
  ON "documents" ("organization_id");

CREATE TABLE IF NOT EXISTS "document_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "document_id" uuid NOT NULL REFERENCES "documents"("id"),
  "version_number" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "filename" text NOT NULL,
  "content_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "pathname" text NOT NULL UNIQUE,
  "sha256" text,
  "status" text DEFAULT 'quarantined' NOT NULL,
  "kind" text NOT NULL,
  "revision_label" text,
  "uploaded_by" text NOT NULL,
  CONSTRAINT "document_versions_status_valid" CHECK (
    "status" IN ('quarantined', 'clean', 'rejected')
  ),
  CONSTRAINT "document_versions_kind_valid" CHECK (
    "kind" IN ('plan', 'specification', 'addendum', 'schedule', 'photo', 'other')
  )
);

ALTER TABLE "document_versions"
  DROP CONSTRAINT IF EXISTS "document_versions_document_version_unique";
ALTER TABLE "document_versions"
  ADD CONSTRAINT "document_versions_document_version_unique"
  UNIQUE ("document_id", "version_number");

CREATE UNIQUE INDEX IF NOT EXISTS "document_versions_organization_sha256_unique"
  ON "document_versions" ("organization_id", "sha256")
  WHERE "sha256" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "document_versions_organization_idx"
  ON "document_versions" ("organization_id");

CREATE TABLE IF NOT EXISTS "document_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "document_version_id" uuid NOT NULL REFERENCES "document_versions"("id"),
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "purpose" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "document_links_entity_type_valid" CHECK (
    "entity_type" IN ('request', 'opportunity', 'estimate', 'project', 'job')
  )
);

ALTER TABLE "document_links"
  DROP CONSTRAINT IF EXISTS "document_links_target_unique";
ALTER TABLE "document_links"
  ADD CONSTRAINT "document_links_target_unique"
  UNIQUE ("document_version_id", "entity_type", "entity_id", "purpose");
CREATE INDEX IF NOT EXISTS "document_links_entity_idx"
  ON "document_links" ("organization_id", "entity_type", "entity_id");

CREATE TABLE IF NOT EXISTS "document_extractions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "document_version_id" uuid NOT NULL REFERENCES "document_versions"("id"),
  "status" text DEFAULT 'queued' NOT NULL,
  "provider" text,
  "model" text,
  "page_progress" integer DEFAULT 0 NOT NULL,
  "page_count" integer,
  "error" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "document_extractions_status_valid" CHECK (
    "status" IN ('queued', 'running', 'ready', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS "document_extractions_version_idx"
  ON "document_extractions" ("organization_id", "document_version_id");

CREATE TABLE IF NOT EXISTS "document_pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "document_version_id" uuid NOT NULL REFERENCES "document_versions"("id"),
  "extraction_id" uuid NOT NULL REFERENCES "document_extractions"("id"),
  "page_number" integer NOT NULL,
  "sheet_label" text,
  "machine_text" text NOT NULL,
  "corrected_text" text
);

ALTER TABLE "document_pages"
  DROP CONSTRAINT IF EXISTS "document_pages_extraction_page_unique";
ALTER TABLE "document_pages"
  ADD CONSTRAINT "document_pages_extraction_page_unique"
  UNIQUE ("extraction_id", "page_number");

CREATE TABLE IF NOT EXISTS "document_chunks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "document_version_id" uuid NOT NULL REFERENCES "document_versions"("id"),
  "page_id" uuid NOT NULL REFERENCES "document_pages"("id"),
  "start_offset" integer NOT NULL,
  "end_offset" integer NOT NULL,
  "content_hash" text NOT NULL,
  "text" text NOT NULL,
  "bbox" jsonb
);

CREATE INDEX IF NOT EXISTS "document_chunks_version_idx"
  ON "document_chunks" ("organization_id", "document_version_id");
