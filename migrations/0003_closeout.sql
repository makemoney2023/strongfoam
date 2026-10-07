CREATE TABLE `closeouts` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`job_id` text NOT NULL,
	`status` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`packet_text` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "closeouts_status_valid" CHECK("closeouts"."status" IN ('preparing', 'ready', 'signed')),
	CONSTRAINT "closeouts_note_valid" CHECK(length("closeouts"."note") <= 500)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `closeouts_job_unique` ON `closeouts` (`organization_id`,`job_id`);
--> statement-breakpoint
CREATE INDEX `closeouts_job_idx` ON `closeouts` (`organization_id`,`job_id`);
--> statement-breakpoint
CREATE INDEX `closeouts_attention_idx` ON `closeouts` (`organization_id`,`status`) WHERE "closeouts"."status" IN ('preparing', 'ready');
