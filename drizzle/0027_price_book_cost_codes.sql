ALTER TABLE public.price_book_items
  ADD COLUMN IF NOT EXISTS item_code text,
  ADD COLUMN IF NOT EXISTS item_kind text,
  ADD COLUMN IF NOT EXISTS supplier text,
  ADD COLUMN IF NOT EXISTS unit_cost_cents integer;

ALTER TABLE public.price_book_item_versions
  ADD COLUMN IF NOT EXISTS unit_cost_cents integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'price_book_items_kind_valid'
  ) THEN
    ALTER TABLE public.price_book_items
      ADD CONSTRAINT price_book_items_kind_valid
      CHECK (item_kind IS NULL OR item_kind IN ('material', 'labour', 'equipment'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'price_book_items_cost_valid'
  ) THEN
    ALTER TABLE public.price_book_items
      ADD CONSTRAINT price_book_items_cost_valid
      CHECK (unit_cost_cents IS NULL OR (unit_cost_cents >= 0 AND unit_cost_cents <= 100000000));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'price_book_item_versions_cost_valid'
  ) THEN
    ALTER TABLE public.price_book_item_versions
      ADD CONSTRAINT price_book_item_versions_cost_valid
      CHECK (unit_cost_cents IS NULL OR (unit_cost_cents >= 0 AND unit_cost_cents <= 100000000));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS price_book_items_org_item_code_unique
  ON public.price_book_items (organization_id, item_code)
  WHERE item_code IS NOT NULL;
