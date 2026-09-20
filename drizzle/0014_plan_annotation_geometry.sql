ALTER TABLE "job_plan_annotations"
  ADD COLUMN IF NOT EXISTS "geometry" jsonb DEFAULT '{"type":"pin"}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "trade" text;

UPDATE "job_plan_annotations"
SET "geometry" = '{"type":"pin"}'::jsonb
WHERE "geometry" IS NULL
   OR NOT (("geometry" ? 'type'));

ALTER TABLE "job_plan_annotations"
  DROP CONSTRAINT IF EXISTS "job_plan_annotations_kind_valid";

ALTER TABLE "job_plan_annotations"
  ADD CONSTRAINT "job_plan_annotations_kind_valid"
  CHECK ("kind" IN ('pin', 'circle', 'ellipse', 'polygon', 'arrow', 'text'));

ALTER TABLE "job_plan_annotations"
  DROP CONSTRAINT IF EXISTS "job_plan_annotations_trade_valid";

ALTER TABLE "job_plan_annotations"
  ADD CONSTRAINT "job_plan_annotations_trade_valid"
  CHECK (
    "trade" IS NULL
    OR "trade" IN (
      'spray_foam',
      'fireproofing',
      'intumescent',
      'avb',
      'drywall',
      'flooring',
      'general'
    )
  );
