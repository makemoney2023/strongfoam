CREATE TABLE `quality_records` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`job_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`status` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "quality_records_kind_valid" CHECK("quality_records"."kind" IN ('deficiency', 'rework')),
	CONSTRAINT "quality_records_status_valid" CHECK("quality_records"."status" IN ('open', 'corrected', 'reopened')),
	CONSTRAINT "quality_records_name_valid" CHECK(length("quality_records"."name") BETWEEN 1 AND 80 AND "quality_records"."name_key" = lower("quality_records"."name") AND length("quality_records"."note") <= 500)
);
--> statement-breakpoint
CREATE INDEX `quality_records_job_idx` ON `quality_records` (`organization_id`,`job_id`);
--> statement-breakpoint
CREATE INDEX `quality_records_attention_idx` ON `quality_records` (`organization_id`,`status`) WHERE "quality_records"."status" IN ('open', 'reopened');
--> statement-breakpoint
CREATE UNIQUE INDEX `quality_records_slot_unique` ON `quality_records` (`organization_id`,`job_id`,`kind`,`name_key`);
