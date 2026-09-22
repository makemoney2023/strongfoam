CREATE TABLE IF NOT EXISTS "price_book_item_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "version_number" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "trade" text NOT NULL,
  "description" text NOT NULL,
  "unit" text NOT NULL,
  "unit_price_cents" integer NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "effective_at" timestamptz,
  "created_by" text NOT NULL,
  "approved_by" text,
  "approved_at" timestamptz,
  "content_hash" text NOT NULL,
  CONSTRAINT "price_book_item_versions_item_version_unique" UNIQUE ("item_id", "version_number"),
  CONSTRAINT "price_book_item_versions_status_valid" CHECK ("status" IN ('draft', 'approved')),
  CONSTRAINT "price_book_item_versions_trade_valid" CHECK (
    "trade" IN ('spray-foam', 'fireproofing', 'intumescent', 'avb', 'spf-roofing')
  ),
  CONSTRAINT "price_book_item_versions_unit_valid" CHECK (
    "unit" IN ('bags', 'sq_ft', 'hour', 'each')
  ),
  CONSTRAINT "price_book_item_versions_price_valid" CHECK (
    "unit_price_cents" >= 0 AND "unit_price_cents" <= 100000000
  )
);

ALTER TABLE "price_book_items" ADD COLUMN IF NOT EXISTS "current_approved_version_id" uuid;

DO $$ BEGIN
  ALTER TABLE "price_book_item_versions"
    ADD CONSTRAINT "price_book_item_versions_organization_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "price_book_item_versions"
    ADD CONSTRAINT "price_book_item_versions_item_id_fk"
    FOREIGN KEY ("item_id") REFERENCES "price_book_items"("id");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "price_book_item_versions_item_idx"
  ON "price_book_item_versions" ("organization_id", "item_id");

INSERT INTO "price_book_item_versions" (
  "organization_id",
  "item_id",
  "version_number",
  "created_at",
  "trade",
  "description",
  "unit",
  "unit_price_cents",
  "status",
  "effective_at",
  "created_by",
  "approved_by",
  "approved_at",
  "content_hash"
)
SELECT
  item."organization_id",
  item."id",
  1,
  item."created_at",
  item."trade",
  item."name",
  item."unit",
  item."unit_price_cents",
  'approved',
  item."created_at",
  item."created_by",
  item."created_by",
  item."created_at",
  md5(concat_ws(
    E'\n',
    item."id"::text,
    '1',
    item."trade",
    item."name",
    item."unit",
    item."unit_price_cents"::text
  ))
FROM "price_book_items" AS item
WHERE NOT EXISTS (
  SELECT 1 FROM "price_book_item_versions" AS version
  WHERE version."item_id" = item."id"
);

UPDATE "price_book_items" AS item
SET "current_approved_version_id" = version."id"
FROM "price_book_item_versions" AS version
WHERE version."item_id" = item."id"
  AND version."version_number" = 1
  AND item."current_approved_version_id" IS NULL;

DO $$ BEGIN
  ALTER TABLE "price_book_items"
    ADD CONSTRAINT "price_book_items_current_approved_version_id_fk"
    FOREIGN KEY ("current_approved_version_id") REFERENCES "price_book_item_versions"("id");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION price_book_item_versions_reject_approved_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD.status = 'approved' THEN
    RAISE EXCEPTION 'immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS price_book_item_versions_reject_approved_mutation
  ON "price_book_item_versions";

CREATE TRIGGER price_book_item_versions_reject_approved_mutation
  BEFORE UPDATE OR DELETE ON "price_book_item_versions"
  FOR EACH ROW
  EXECUTE FUNCTION price_book_item_versions_reject_approved_mutation();
