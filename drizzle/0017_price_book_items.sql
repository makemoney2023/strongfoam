CREATE TABLE IF NOT EXISTS "price_book_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "trade" text NOT NULL,
  "name" text NOT NULL,
  "unit" text NOT NULL,
  "unit_price_cents" integer NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_by" text NOT NULL,
  CONSTRAINT "price_book_items_trade_valid" CHECK (
    "trade" IN ('spray-foam', 'fireproofing', 'intumescent', 'avb', 'spf-roofing')
  ),
  CONSTRAINT "price_book_items_unit_valid" CHECK (
    "unit" IN ('bags', 'sq_ft', 'hour', 'each')
  ),
  CONSTRAINT "price_book_items_price_valid" CHECK (
    "unit_price_cents" >= 0
    AND "unit_price_cents" <= 100000000
  )
);

CREATE INDEX IF NOT EXISTS "price_book_items_trade_name_idx"
  ON "price_book_items" ("trade", "name");
