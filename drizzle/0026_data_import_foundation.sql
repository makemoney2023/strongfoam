CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.data_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  filename text NOT NULL,
  content_type text NOT NULL,
  byte_size integer NOT NULL,
  sha256 text NOT NULL,
  idempotency_key text NOT NULL,
  status text NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  preview_hash text,
  durable boolean NOT NULL DEFAULT false,
  summary jsonb NOT NULL,
  file_bytes bytea,
  CONSTRAINT data_import_batches_org_idempotency_unique UNIQUE (organization_id, idempotency_key),
  CONSTRAINT data_import_batches_status_valid CHECK (
    status IN (
      'uploaded',
      'analyzing',
      'needs_mapping',
      'invalid',
      'ready',
      'commit_queued',
      'importing',
      'completed',
      'failed',
      'cancelled'
    )
  )
);

CREATE INDEX IF NOT EXISTS data_import_batches_org_idx
  ON private.data_import_batches (organization_id, created_at);

CREATE TABLE IF NOT EXISTS private.data_import_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES private.data_import_batches (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  sheet_name text NOT NULL,
  entity_type text,
  row_count integer NOT NULL,
  headers jsonb NOT NULL,
  CONSTRAINT data_import_sheets_batch_name_unique UNIQUE (batch_id, sheet_name)
);

CREATE INDEX IF NOT EXISTS data_import_sheets_org_idx
  ON private.data_import_sheets (organization_id);

CREATE TABLE IF NOT EXISTS private.data_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES private.data_import_batches (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  sheet_name text NOT NULL,
  row_number integer NOT NULL,
  entity_type text NOT NULL,
  source_key text NOT NULL,
  status text NOT NULL,
  operation text NOT NULL DEFAULT 'create',
  values jsonb NOT NULL,
  messages jsonb NOT NULL,
  target_id uuid,
  CONSTRAINT data_import_rows_batch_row_unique UNIQUE (batch_id, sheet_name, row_number),
  CONSTRAINT data_import_rows_status_valid CHECK (status IN ('valid', 'warning', 'error', 'conflict')),
  CONSTRAINT data_import_rows_operation_valid CHECK (operation IN ('create', 'update', 'skip'))
);

CREATE INDEX IF NOT EXISTS data_import_rows_org_idx
  ON private.data_import_rows (organization_id, batch_id);

CREATE TABLE IF NOT EXISTS private.data_import_mapping_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  entity_type text NOT NULL,
  header_signature text NOT NULL,
  mapping jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT data_import_profiles_signature_unique UNIQUE (organization_id, entity_type, header_signature)
);

CREATE TABLE IF NOT EXISTS private.external_record_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  source_system text NOT NULL,
  entity_type text NOT NULL,
  source_key text NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT external_record_keys_unique UNIQUE (organization_id, source_system, entity_type, source_key)
);

CREATE INDEX IF NOT EXISTS external_record_keys_org_idx
  ON private.external_record_keys (organization_id);

CREATE TABLE IF NOT EXISTS private.data_import_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES private.data_import_batches (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL,
  kind text NOT NULL,
  summary text NOT NULL,
  payload jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS data_import_events_org_idx
  ON private.data_import_events (organization_id, batch_id);

CREATE OR REPLACE FUNCTION private.prevent_import_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'import events are append-only';
END;
$$;

DROP TRIGGER IF EXISTS data_import_events_append_only ON private.data_import_events;
CREATE TRIGGER data_import_events_append_only
BEFORE UPDATE OR DELETE ON private.data_import_events
FOR EACH ROW
EXECUTE FUNCTION private.prevent_import_event_mutation();

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA private FROM anon, authenticated;

DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['postgres', 'strongfoam_app']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('GRANT USAGE ON SCHEMA private TO %I', role_name);
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA private TO %I',
        role_name
      );
    END IF;
  END LOOP;
END $$;
