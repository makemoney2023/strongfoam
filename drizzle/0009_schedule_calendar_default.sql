LOCK TABLE "schedule_calendars" IN SHARE MODE;

WITH "ranked_defaults" AS (
  SELECT
    "id",
    row_number() OVER (ORDER BY "created_at", "id") AS "default_rank"
  FROM "schedule_calendars"
  WHERE "is_default"
)
UPDATE "schedule_calendars"
SET "is_default" = false
FROM "ranked_defaults"
WHERE "schedule_calendars"."id" = "ranked_defaults"."id"
  AND "ranked_defaults"."default_rank" > 1;

CREATE UNIQUE INDEX "schedule_calendars_single_default_idx"
  ON "schedule_calendars" ("is_default")
  WHERE "is_default";
