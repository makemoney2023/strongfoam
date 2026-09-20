ALTER TABLE "job_documents"
  DROP CONSTRAINT IF EXISTS "job_documents_replaces_document_fk";

ALTER TABLE "job_documents"
  ADD CONSTRAINT "job_documents_replaces_document_fk"
  FOREIGN KEY ("replaces_document_id")
  REFERENCES "job_documents"("id")
  ON DELETE SET NULL;

ALTER TABLE "job_field_notes"
  DROP CONSTRAINT IF EXISTS "job_field_notes_annotation_fk";

ALTER TABLE "job_field_notes"
  ADD CONSTRAINT "job_field_notes_annotation_fk"
  FOREIGN KEY ("annotation_id")
  REFERENCES "job_plan_annotations"("id")
  ON DELETE SET NULL;

UPDATE "job_plan_annotations" AS annotation
SET "work_area_id" = NULL
WHERE annotation."work_area_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "work_areas" AS area
    WHERE area."id" = annotation."work_area_id"
      AND area."job_id" = annotation."job_id"
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'job_plan_annotations_work_area_job_fk'
  ) THEN
    ALTER TABLE "job_plan_annotations"
      ADD CONSTRAINT "job_plan_annotations_work_area_job_fk"
      FOREIGN KEY ("work_area_id", "job_id")
      REFERENCES "work_areas"("id", "job_id");
  END IF;
END
$$;

WITH ranked_current_revisions AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "sheet_key"
      ORDER BY "version_number" DESC, "created_at" DESC, "id" DESC
    ) AS revision_rank
  FROM "job_documents"
  WHERE "kind" = 'plan'
    AND "superseded_at" IS NULL
    AND "sheet_key" <> ''
)
UPDATE "job_documents"
SET "superseded_at" = now()
FROM ranked_current_revisions
WHERE "job_documents"."id" = ranked_current_revisions."id"
  AND ranked_current_revisions.revision_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "job_documents_sheet_current_unique"
  ON "job_documents" ("sheet_key")
  WHERE "kind" = 'plan'
    AND "superseded_at" IS NULL
    AND "sheet_key" <> '';
