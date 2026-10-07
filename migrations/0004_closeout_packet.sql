CREATE TABLE `insulation_assemblies` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`job_id` text NOT NULL,
	`location` text NOT NULL,
	`existing_r_value` text DEFAULT '' NOT NULL,
	`target_r_value` text NOT NULL,
	`area_sq_ft` integer NOT NULL,
	`depth_inches` text DEFAULT '' NOT NULL,
	`product` text NOT NULL,
	`manufacturer` text DEFAULT '' NOT NULL,
	`batch` text DEFAULT '' NOT NULL,
	`lot` text DEFAULT '' NOT NULL,
	`bag_count` integer NOT NULL,
	`air_barrier` text DEFAULT '' NOT NULL,
	`vapor_barrier` text DEFAULT '' NOT NULL,
	`blower_door` text DEFAULT '' NOT NULL,
	`rebate_program` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "insulation_assemblies_location_valid" CHECK("insulation_assemblies"."location" IN ('attic', 'wall', 'rim_joist', 'basement', 'crawlspace', 'roof')),
	CONSTRAINT "insulation_assemblies_measures_valid" CHECK("insulation_assemblies"."area_sq_ft" > 0 AND "insulation_assemblies"."area_sq_ft" <= 1000000 AND "insulation_assemblies"."bag_count" > 0 AND "insulation_assemblies"."bag_count" <= 1000000 AND length("insulation_assemblies"."product") BETWEEN 1 AND 80 AND length("insulation_assemblies"."target_r_value") BETWEEN 1 AND 20)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `insulation_assemblies_job_unique` ON `insulation_assemblies` (`organization_id`,`job_id`);
--> statement-breakpoint
CREATE INDEX `insulation_assemblies_job_idx` ON `insulation_assemblies` (`organization_id`,`job_id`);
--> statement-breakpoint
CREATE TABLE `crew_capacities` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`jobs_per_day` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "crew_capacities_jobs_per_day_valid" CHECK("crew_capacities"."jobs_per_day" >= 1 AND "crew_capacities"."jobs_per_day" <= 3)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crew_capacities_user_unique` ON `crew_capacities` (`organization_id`,`user_id`);
