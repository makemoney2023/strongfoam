CREATE TABLE `ai_citations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`proposal_id` text NOT NULL,
	`item_path` text NOT NULL,
	`document_version_id` text NOT NULL,
	`chunk_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`page_number` integer NOT NULL,
	`start_offset` integer NOT NULL,
	`end_offset` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`proposal_id`) REFERENCES `ai_proposals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_version_id`) REFERENCES `document_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chunk_id`) REFERENCES `document_chunks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ai_citations_proposal_idx` ON `ai_citations` (`organization_id`,`proposal_id`);--> statement-breakpoint
CREATE TABLE `ai_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`run_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`output` text NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `ai_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ai_proposals_status_valid" CHECK("ai_proposals"."status" IN ('proposed', 'dismissed', 'applied'))
);
--> statement-breakpoint
CREATE INDEX `ai_proposals_opportunity_idx` ON `ai_proposals` (`organization_id`,`opportunity_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ai_proposals_run_unique` ON `ai_proposals` (`run_id`);--> statement-breakpoint
CREATE TABLE `ai_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`capability_id` text NOT NULL,
	`provider` text,
	`model` text,
	`prompt_template_version` text NOT NULL,
	`response_schema_version` text NOT NULL,
	`actor_email` text,
	`service` text,
	`content_hash` text NOT NULL,
	`selected_source_ids` text NOT NULL,
	`status` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`error` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ai_runs_capability_valid" CHECK("ai_runs"."capability_id" IN ('AI-016', 'AI-018')),
	CONSTRAINT "ai_runs_status_valid" CHECK("ai_runs"."status" IN ('completed', 'failed'))
);
--> statement-breakpoint
CREATE INDEX `ai_runs_organization_idx` ON `ai_runs` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `ai_runs_idempotency_unique` ON `ai_runs` (`organization_id`,`idempotency_key`);--> statement-breakpoint
CREATE TABLE `ai_tool_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`run_id` text NOT NULL,
	`tool_name` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `ai_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ai_tool_executions_run_idx` ON `ai_tool_executions` (`organization_id`,`run_id`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`result` text NOT NULL,
	`correlation_id` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "audit_events_result_valid" CHECK("audit_events"."result" IN ('success', 'denied', 'failure'))
);
--> statement-breakpoint
CREATE INDEX `audit_events_organization_created_idx` ON `audit_events` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_events_entity_idx` ON `audit_events` (`organization_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `background_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`kind` text NOT NULL,
	`aggregate_type` text NOT NULL,
	`aggregate_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 5 NOT NULL,
	`checkpoint` text,
	`locked_by` text,
	`next_run_at` integer,
	`payload` text NOT NULL,
	`last_error` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "background_jobs_status_valid" CHECK("background_jobs"."status" IN ('queued', 'running', 'retry_wait', 'completed', 'dead_letter', 'cancelled'))
);
--> statement-breakpoint
CREATE INDEX `background_jobs_status_idx` ON `background_jobs` (`organization_id`,`status`,`next_run_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `background_jobs_organization_idempotency_unique` ON `background_jobs` (`organization_id`,`idempotency_key`);--> statement-breakpoint
CREATE TABLE `calendly_unmatched_events` (
	`id` text PRIMARY KEY NOT NULL,
	`received_at` integer NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `change_order_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`change_order_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`rule_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`decision` text NOT NULL,
	`comment` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`change_order_id`) REFERENCES `change_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rule_id`) REFERENCES `commercial_approval_rules`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "change_order_approvals_decision_valid" CHECK("change_order_approvals"."decision" IN ('approved', 'rejected'))
);
--> statement-breakpoint
CREATE INDEX `change_order_approvals_order_idx` ON `change_order_approvals` (`organization_id`,`change_order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `change_order_approvals_actor_unique` ON `change_order_approvals` (`change_order_id`,`actor_email`);--> statement-breakpoint
CREATE TABLE `change_order_budget_effects` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`project_id` text NOT NULL,
	`change_order_id` text NOT NULL,
	`approval_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`price_cents` integer NOT NULL,
	`schedule_impact_days` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`change_order_id`) REFERENCES `change_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approval_id`) REFERENCES `change_order_approvals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `change_order_budget_effects_project_idx` ON `change_order_budget_effects` (`organization_id`,`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `change_order_budget_effects_order_unique` ON `change_order_budget_effects` (`change_order_id`);--> statement-breakpoint
CREATE TABLE `change_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`project_id` text NOT NULL,
	`number` text NOT NULL,
	`scope` text NOT NULL,
	`price_cents` integer NOT NULL,
	`schedule_impact_days` integer NOT NULL,
	`status` text NOT NULL,
	`content_hash` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "change_orders_status_valid" CHECK("change_orders"."status" IN ('draft', 'pending', 'approved', 'rejected', 'void'))
);
--> statement-breakpoint
CREATE INDEX `change_orders_project_idx` ON `change_orders` (`organization_id`,`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `change_orders_project_number_unique` ON `change_orders` (`project_id`,`number`);--> statement-breakpoint
CREATE TABLE `commercial_approval_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`active` integer NOT NULL,
	`second_approver_total_cents` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`city` text,
	`province` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `companies_organization_idx` ON `companies` (`organization_id`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`company_id` text,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`role` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `contacts_organization_idx` ON `contacts` (`organization_id`);--> statement-breakpoint
CREATE TABLE `private_data_import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`sha256` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`preview_hash` text,
	`durable` integer DEFAULT false NOT NULL,
	`summary` text NOT NULL,
	`file_bytes` blob,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "data_import_batches_status_valid" CHECK("private_data_import_batches"."status" IN ('uploaded', 'analyzing', 'needs_mapping', 'invalid', 'ready', 'commit_queued', 'importing', 'completed', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE INDEX `data_import_batches_org_idx` ON `private_data_import_batches` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `data_import_batches_org_idempotency_unique` ON `private_data_import_batches` (`organization_id`,`idempotency_key`);--> statement-breakpoint
CREATE TABLE `private_data_import_events` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`actor` text NOT NULL,
	`kind` text NOT NULL,
	`summary` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `private_data_import_batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `data_import_events_org_idx` ON `private_data_import_events` (`organization_id`,`batch_id`);--> statement-breakpoint
CREATE TABLE `private_data_import_mapping_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`entity_type` text NOT NULL,
	`header_signature` text NOT NULL,
	`mapping` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `data_import_profiles_signature_unique` ON `private_data_import_mapping_profiles` (`organization_id`,`entity_type`,`header_signature`);--> statement-breakpoint
CREATE TABLE `private_data_import_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`sheet_name` text NOT NULL,
	`row_number` integer NOT NULL,
	`entity_type` text NOT NULL,
	`source_key` text NOT NULL,
	`status` text NOT NULL,
	`operation` text DEFAULT 'create' NOT NULL,
	`values` text NOT NULL,
	`messages` text NOT NULL,
	`target_id` text,
	FOREIGN KEY (`batch_id`) REFERENCES `private_data_import_batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `data_import_rows_org_idx` ON `private_data_import_rows` (`organization_id`,`batch_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `data_import_rows_batch_row_unique` ON `private_data_import_rows` (`batch_id`,`sheet_name`,`row_number`);--> statement-breakpoint
CREATE TABLE `private_data_import_sheets` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`sheet_name` text NOT NULL,
	`entity_type` text,
	`row_count` integer NOT NULL,
	`headers` text NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `private_data_import_batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `data_import_sheets_org_idx` ON `private_data_import_sheets` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `data_import_sheets_batch_name_unique` ON `private_data_import_sheets` (`batch_id`,`sheet_name`);--> statement-breakpoint
CREATE TABLE `dead_letter_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`background_job_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`kind` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`attempts` integer NOT NULL,
	`checkpoint` text,
	`last_error` text,
	`payload` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`background_job_id`) REFERENCES `background_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `dead_letter_jobs_organization_idx` ON `dead_letter_jobs` (`organization_id`);--> statement-breakpoint
CREATE TABLE `dispatches` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`job_id` text NOT NULL,
	`user_id` text NOT NULL,
	`work_date` text NOT NULL,
	`status` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "dispatches_status_valid" CHECK("dispatches"."status" IN ('scheduled', 'cancelled'))
);
--> statement-breakpoint
CREATE INDEX `dispatches_day_idx` ON `dispatches` (`organization_id`,`work_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `dispatches_slot_unique` ON `dispatches` (`organization_id`,`job_id`,`user_id`,`work_date`);--> statement-breakpoint
CREATE TABLE `document_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`document_version_id` text NOT NULL,
	`page_id` text NOT NULL,
	`start_offset` integer NOT NULL,
	`end_offset` integer NOT NULL,
	`content_hash` text NOT NULL,
	`text` text NOT NULL,
	`bbox` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_version_id`) REFERENCES `document_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`page_id`) REFERENCES `document_pages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `document_chunks_version_idx` ON `document_chunks` (`organization_id`,`document_version_id`);--> statement-breakpoint
CREATE TABLE `document_extractions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`document_version_id` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`provider` text,
	`model` text,
	`page_progress` integer DEFAULT 0 NOT NULL,
	`page_count` integer,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_version_id`) REFERENCES `document_versions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "document_extractions_status_valid" CHECK("document_extractions"."status" IN ('queued', 'running', 'ready', 'failed'))
);
--> statement-breakpoint
CREATE INDEX `document_extractions_version_idx` ON `document_extractions` (`organization_id`,`document_version_id`);--> statement-breakpoint
CREATE TABLE `document_links` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`document_version_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`purpose` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_version_id`) REFERENCES `document_versions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "document_links_entity_type_valid" CHECK("document_links"."entity_type" IN ('request', 'opportunity', 'estimate', 'project', 'job'))
);
--> statement-breakpoint
CREATE INDEX `document_links_entity_idx` ON `document_links` (`organization_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `document_links_target_unique` ON `document_links` (`document_version_id`,`entity_type`,`entity_id`,`purpose`);--> statement-breakpoint
CREATE TABLE `document_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`document_version_id` text NOT NULL,
	`extraction_id` text NOT NULL,
	`page_number` integer NOT NULL,
	`sheet_label` text,
	`machine_text` text NOT NULL,
	`corrected_text` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_version_id`) REFERENCES `document_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`extraction_id`) REFERENCES `document_extractions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_pages_extraction_page_unique` ON `document_pages` (`extraction_id`,`page_number`);--> statement-breakpoint
CREATE TABLE `document_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`document_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`created_at` integer NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`pathname` text NOT NULL,
	`sha256` text,
	`status` text DEFAULT 'quarantined' NOT NULL,
	`kind` text NOT NULL,
	`revision_label` text,
	`uploaded_by` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "document_versions_status_valid" CHECK("document_versions"."status" IN ('quarantined', 'clean', 'rejected')),
	CONSTRAINT "document_versions_kind_valid" CHECK("document_versions"."kind" IN ('plan', 'specification', 'addendum', 'schedule', 'photo', 'other'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_versions_pathname_unique` ON `document_versions` (`pathname`);--> statement-breakpoint
CREATE UNIQUE INDEX `document_versions_organization_sha256_unique` ON `document_versions` (`organization_id`,`sha256`) WHERE "document_versions"."sha256" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `document_versions_organization_idx` ON `document_versions` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `document_versions_document_version_unique` ON `document_versions` (`document_id`,`version_number`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`title` text NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `documents_organization_idx` ON `documents` (`organization_id`);--> statement-breakpoint
CREATE TABLE `equipment_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`job_id` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "equipment_assignments_status_valid" CHECK("equipment_assignments"."status" IN ('assigned', 'released')),
	CONSTRAINT "equipment_assignments_name_valid" CHECK(length("equipment_assignments"."name") BETWEEN 1 AND 80 AND "equipment_assignments"."name_key" = lower("equipment_assignments"."name") AND length("equipment_assignments"."note") <= 500)
);
--> statement-breakpoint
CREATE INDEX `equipment_assignments_job_idx` ON `equipment_assignments` (`organization_id`,`job_id`);--> statement-breakpoint
CREATE INDEX `equipment_assignments_active_idx` ON `equipment_assignments` (`organization_id`,`name_key`) WHERE "equipment_assignments"."status" = 'assigned';--> statement-breakpoint
CREATE UNIQUE INDEX `equipment_assignments_slot_unique` ON `equipment_assignments` (`organization_id`,`job_id`,`name_key`);--> statement-breakpoint
CREATE TABLE `estimate_acceptances` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`proposal_id` text NOT NULL,
	`estimate_id` text NOT NULL,
	`estimate_version_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`recipient_name` text NOT NULL,
	`recipient_email` text NOT NULL,
	`attestation` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estimate_id`) REFERENCES `estimates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estimate_version_id`) REFERENCES `estimate_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `estimate_acceptances_estimate_idx` ON `estimate_acceptances` (`organization_id`,`estimate_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `estimate_acceptances_proposal_unique` ON `estimate_acceptances` (`proposal_id`);--> statement-breakpoint
CREATE TABLE `estimate_alternates` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`estimate_version_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`included` integer NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estimate_version_id`) REFERENCES `estimate_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `estimate_alternates_version_idx` ON `estimate_alternates` (`organization_id`,`estimate_version_id`);--> statement-breakpoint
CREATE TABLE `estimate_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`estimate_id` text NOT NULL,
	`estimate_version_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`content_hash` text NOT NULL,
	`rule_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`decision` text NOT NULL,
	`comment` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estimate_id`) REFERENCES `estimates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estimate_version_id`) REFERENCES `estimate_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rule_id`) REFERENCES `commercial_approval_rules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `estimate_approvals_estimate_idx` ON `estimate_approvals` (`organization_id`,`estimate_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `estimate_approvals_actor_version_unique` ON `estimate_approvals` (`estimate_version_id`,`actor_email`);--> statement-breakpoint
CREATE TABLE `estimate_clauses` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`estimate_version_id` text NOT NULL,
	`kind` text NOT NULL,
	`text` text NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estimate_version_id`) REFERENCES `estimate_versions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "estimate_clauses_kind_valid" CHECK("estimate_clauses"."kind" IN ('inclusion', 'exclusion', 'assumption'))
);
--> statement-breakpoint
CREATE INDEX `estimate_clauses_version_idx` ON `estimate_clauses` (`organization_id`,`estimate_version_id`);--> statement-breakpoint
CREATE TABLE `estimate_conversions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`acceptance_id` text NOT NULL,
	`estimate_id` text NOT NULL,
	`estimate_version_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`payload_hash` text NOT NULL,
	`project_id` text NOT NULL,
	`job_ids` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`acceptance_id`) REFERENCES `estimate_acceptances`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estimate_id`) REFERENCES `estimates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estimate_version_id`) REFERENCES `estimate_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `estimate_conversions_estimate_idx` ON `estimate_conversions` (`organization_id`,`estimate_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `estimate_conversions_acceptance_unique` ON `estimate_conversions` (`acceptance_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `estimate_conversions_idempotency_unique` ON `estimate_conversions` (`organization_id`,`idempotency_key`);--> statement-breakpoint
CREATE TABLE `estimate_job_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`estimate_version_id` text NOT NULL,
	`name` text NOT NULL,
	`trade` text NOT NULL,
	`scope` text NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estimate_version_id`) REFERENCES `estimate_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `estimate_job_packages_version_idx` ON `estimate_job_packages` (`organization_id`,`estimate_version_id`);--> statement-breakpoint
CREATE TABLE `estimate_job_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`package_id` text NOT NULL,
	`work_area_id` text,
	`title` text NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`package_id`) REFERENCES `estimate_job_packages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`work_area_id`) REFERENCES `estimate_job_work_areas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `estimate_job_tasks_package_idx` ON `estimate_job_tasks` (`organization_id`,`package_id`);--> statement-breakpoint
CREATE TABLE `estimate_job_work_areas` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`package_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`package_id`) REFERENCES `estimate_job_packages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `estimate_job_work_areas_package_idx` ON `estimate_job_work_areas` (`organization_id`,`package_id`);--> statement-breakpoint
CREATE TABLE `estimate_line_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`line_id` text NOT NULL,
	`document_version_id` text NOT NULL,
	`page_number` integer NOT NULL,
	`sheet_label` text,
	`chunk_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`start_offset` integer NOT NULL,
	`end_offset` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`line_id`) REFERENCES `estimate_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_version_id`) REFERENCES `document_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chunk_id`) REFERENCES `document_chunks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `estimate_line_sources_line_idx` ON `estimate_line_sources` (`organization_id`,`line_id`);--> statement-breakpoint
CREATE TABLE `estimate_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`estimate_version_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`trade` text NOT NULL,
	`location` text,
	`method` text NOT NULL,
	`quantity` text,
	`unit` text,
	`unit_price_cents` integer,
	`basis_points` integer,
	`basis_categories` text NOT NULL,
	`taxable` integer NOT NULL,
	`alternate_id` text,
	`price_book_item_id` text,
	`price_book_version_id` text,
	`line_total_cents` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estimate_version_id`) REFERENCES `estimate_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`alternate_id`) REFERENCES `estimate_alternates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`price_book_item_id`) REFERENCES `price_book_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`price_book_version_id`) REFERENCES `price_book_item_versions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "estimate_lines_category_valid" CHECK("estimate_lines"."category" IN ('labor', 'material', 'equipment', 'subcontractor', 'allowance')),
	CONSTRAINT "estimate_lines_method_valid" CHECK("estimate_lines"."method" IN ('unit', 'fixed', 'percent'))
);
--> statement-breakpoint
CREATE INDEX `estimate_lines_version_idx` ON `estimate_lines` (`organization_id`,`estimate_version_id`);--> statement-breakpoint
CREATE TABLE `estimate_request_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`actor` text NOT NULL,
	`body` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `estimate_request_events` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`actor` text NOT NULL,
	`kind` text NOT NULL,
	`summary` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `estimate_request_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`title` text NOT NULL,
	`assignee` text,
	`due_at` integer,
	`status` text DEFAULT 'open' NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `estimate_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`estimate_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`overhead_basis_points` integer NOT NULL,
	`markup_basis_points` integer NOT NULL,
	`tax_basis_points` integer NOT NULL,
	`calculation_order` text NOT NULL,
	`base_subtotal_cents` integer NOT NULL,
	`alternate_total_cents` integer NOT NULL,
	`overhead_cents` integer NOT NULL,
	`markup_cents` integer NOT NULL,
	`tax_cents` integer NOT NULL,
	`total_cents` integer NOT NULL,
	`content_hash` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estimate_id`) REFERENCES `estimates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `estimate_versions_estimate_idx` ON `estimate_versions` (`organization_id`,`estimate_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `estimate_versions_number_unique` ON `estimate_versions` (`estimate_id`,`version_number`);--> statement-breakpoint
CREATE TABLE `estimates` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`number` text NOT NULL,
	`title` text NOT NULL,
	`created_by` text NOT NULL,
	`current_version_id` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `estimates_opportunity_idx` ON `estimates` (`organization_id`,`opportunity_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `estimates_organization_number_unique` ON `estimates` (`organization_id`,`number`);--> statement-breakpoint
CREATE TABLE `private_external_record_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`source_system` text NOT NULL,
	`entity_type` text NOT NULL,
	`source_key` text NOT NULL,
	`target_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `external_record_keys_org_idx` ON `private_external_record_keys` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `external_record_keys_unique` ON `private_external_record_keys` (`organization_id`,`source_system`,`entity_type`,`source_key`);--> statement-breakpoint
CREATE TABLE `inspections` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`job_id` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`result` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "inspections_result_valid" CHECK("inspections"."result" IN ('open', 'passed', 'failed')),
	CONSTRAINT "inspections_name_valid" CHECK(length("inspections"."name") BETWEEN 1 AND 80 AND "inspections"."name_key" = lower("inspections"."name") AND length("inspections"."note") <= 500)
);
--> statement-breakpoint
CREATE INDEX `inspections_job_idx` ON `inspections` (`organization_id`,`job_id`);--> statement-breakpoint
CREATE INDEX `inspections_attention_idx` ON `inspections` (`organization_id`,`result`) WHERE "inspections"."result" IN ('open', 'failed');--> statement-breakpoint
CREATE UNIQUE INDEX `inspections_slot_unique` ON `inspections` (`organization_id`,`job_id`,`name_key`);--> statement-breakpoint
CREATE TABLE `job_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`job_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "job_assignments_role_valid" CHECK("job_assignments"."role" IN ('foreman', 'technician'))
);
--> statement-breakpoint
CREATE INDEX `job_assignments_user_idx` ON `job_assignments` (`user_id`);--> statement-breakpoint
CREATE INDEX `job_assignments_job_idx` ON `job_assignments` (`job_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `job_assignments_job_user_unique` ON `job_assignments` (`job_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `job_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`job_id` text NOT NULL,
	`work_area_id` text,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`pathname` text NOT NULL,
	`storage` text DEFAULT 'blob' NOT NULL,
	`kind` text DEFAULT 'plan' NOT NULL,
	`uploaded_by` text NOT NULL,
	`sheet_key` text DEFAULT '' NOT NULL,
	`version_number` integer DEFAULT 1 NOT NULL,
	`replaces_document_id` text,
	`superseded_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`work_area_id`,`job_id`) REFERENCES `work_areas`(`id`,`job_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`replaces_document_id`) REFERENCES `job_documents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_documents_pathname_unique` ON `job_documents` (`pathname`);--> statement-breakpoint
CREATE INDEX `job_documents_organization_idx` ON `job_documents` (`organization_id`);--> statement-breakpoint
CREATE INDEX `job_documents_job_current_plan_idx` ON `job_documents` (`job_id`,`kind`,`superseded_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `job_documents_sheet_current_unique` ON `job_documents` (`sheet_key`) WHERE "job_documents"."kind" = 'plan' AND "job_documents"."superseded_at" IS NULL AND "job_documents"."sheet_key" <> '';--> statement-breakpoint
CREATE TABLE `job_events` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`actor` text NOT NULL,
	`kind` text NOT NULL,
	`summary` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `job_field_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`job_id` text NOT NULL,
	`work_area_id` text,
	`task_id` text,
	`annotation_id` text,
	`kind` text DEFAULT 'note' NOT NULL,
	`body` text NOT NULL,
	`quantity` integer,
	`unit` text,
	`created_by` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `job_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`annotation_id`) REFERENCES `job_plan_annotations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`work_area_id`,`job_id`) REFERENCES `work_areas`(`id`,`job_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `job_plan_annotations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`job_id` text NOT NULL,
	`document_id` text NOT NULL,
	`page_number` integer DEFAULT 1 NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`kind` text DEFAULT 'pin' NOT NULL,
	`geometry` text DEFAULT '{"type":"pin"}' NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`trade` text,
	`title` text NOT NULL,
	`body` text,
	`work_area_id` text,
	`task_id` text,
	`created_by` text NOT NULL,
	`completed_at` integer,
	`completed_by` text,
	`voided_at` integer,
	`voided_by` text,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_id`) REFERENCES `job_documents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `job_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`work_area_id`,`job_id`) REFERENCES `work_areas`(`id`,`job_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "job_plan_annotations_page_positive" CHECK("job_plan_annotations"."page_number" >= 1),
	CONSTRAINT "job_plan_annotations_x_normalized" CHECK("job_plan_annotations"."x" >= 0 AND "job_plan_annotations"."x" <= 1),
	CONSTRAINT "job_plan_annotations_y_normalized" CHECK("job_plan_annotations"."y" >= 0 AND "job_plan_annotations"."y" <= 1),
	CONSTRAINT "job_plan_annotations_kind_valid" CHECK("job_plan_annotations"."kind" IN ('pin', 'circle', 'ellipse', 'polygon', 'arrow', 'text')),
	CONSTRAINT "job_plan_annotations_trade_valid" CHECK("job_plan_annotations"."trade" IS NULL OR "job_plan_annotations"."trade" IN ('spray_foam', 'fireproofing', 'intumescent', 'avb', 'drywall', 'flooring', 'general')),
	CONSTRAINT "job_plan_annotations_status_valid" CHECK("job_plan_annotations"."status" IN ('planned', 'in_progress', 'completed', 'blocked', 'deficiency'))
);
--> statement-breakpoint
CREATE INDEX `job_plan_annotations_job_document_idx` ON `job_plan_annotations` (`job_id`,`document_id`);--> statement-breakpoint
CREATE TABLE `job_task_dependencies` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`project_id` text NOT NULL,
	`predecessor_task_id` text NOT NULL,
	`successor_task_id` text NOT NULL,
	`lag_days` integer DEFAULT 0 NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`predecessor_task_id`) REFERENCES `job_tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`successor_task_id`) REFERENCES `job_tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "job_task_dependencies_no_self" CHECK("job_task_dependencies"."predecessor_task_id" <> "job_task_dependencies"."successor_task_id"),
	CONSTRAINT "job_task_dependencies_lag_nonnegative" CHECK("job_task_dependencies"."lag_days" >= 0)
);
--> statement-breakpoint
CREATE INDEX `job_task_dependencies_project_idx` ON `job_task_dependencies` (`project_id`);--> statement-breakpoint
CREATE INDEX `job_task_dependencies_successor_idx` ON `job_task_dependencies` (`successor_task_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `job_task_dependencies_unique` ON `job_task_dependencies` (`predecessor_task_id`,`successor_task_id`);--> statement-breakpoint
CREATE TABLE `job_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`job_id` text NOT NULL,
	`work_area_id` text,
	`title` text NOT NULL,
	`assignee` text,
	`assignee_user_id` text,
	`due_at` integer,
	`planned_start_at` integer,
	`planned_end_at` integer,
	`completed_at` integer,
	`status` text DEFAULT 'open' NOT NULL,
	`stated_quantity` integer,
	`stated_unit` text,
	`created_by` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignee_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`work_area_id`,`job_id`) REFERENCES `work_areas`(`id`,`job_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "job_tasks_stated_quantity_valid" CHECK((
        "job_tasks"."stated_quantity" IS NULL
        AND "job_tasks"."stated_unit" IS NULL
      ) OR (
        "job_tasks"."stated_quantity" > 0
        AND "job_tasks"."stated_quantity" <= 1000000
        AND "job_tasks"."stated_unit" IN ('bags', 'sq_ft')
      )),
	CONSTRAINT "job_tasks_planned_date_order" CHECK("job_tasks"."planned_start_at" IS NULL
        OR "job_tasks"."planned_end_at" IS NULL
        OR "job_tasks"."planned_end_at" >= "job_tasks"."planned_start_at")
);
--> statement-breakpoint
CREATE INDEX `job_tasks_job_schedule_idx` ON `job_tasks` (`job_id`,`planned_start_at`,`planned_end_at`);--> statement-breakpoint
CREATE TABLE `job_voice_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`job_id` text NOT NULL,
	`work_area_id` text,
	`task_id` text,
	`annotation_id` text,
	`document_id` text,
	`source` text DEFAULT 'job' NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`pathname` text NOT NULL,
	`storage` text DEFAULT 'blob' NOT NULL,
	`duration_seconds` integer,
	`language` text DEFAULT 'en' NOT NULL,
	`provider` text,
	`model` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`machine_transcript` text,
	`transcript` text,
	`confidence` real,
	`queued_at` integer NOT NULL,
	`processing_started_at` integer,
	`completed_at` integer,
	`failed_at` integer,
	`error` text,
	`consent_at` integer NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `job_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`annotation_id`) REFERENCES `job_plan_annotations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`document_id`) REFERENCES `job_documents`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`work_area_id`,`job_id`) REFERENCES `work_areas`(`id`,`job_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "job_voice_notes_source_valid" CHECK("job_voice_notes"."source" IN ('job', 'task', 'annotation', 'document', 'daily_report')),
	CONSTRAINT "job_voice_notes_status_valid" CHECK("job_voice_notes"."status" IN ('uploading', 'queued', 'processing', 'completed', 'failed')),
	CONSTRAINT "job_voice_notes_size_positive" CHECK("job_voice_notes"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_voice_notes_pathname_unique` ON `job_voice_notes` (`pathname`);--> statement-breakpoint
CREATE INDEX `job_voice_notes_job_created_idx` ON `job_voice_notes` (`job_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`project_id` text,
	`company_id` text,
	`site_id` text,
	`opportunity_id` text,
	`name` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`scope` text,
	`services` text NOT NULL,
	`project_manager` text,
	`foreman` text,
	`planned_start_at` integer,
	`planned_end_at` integer,
	`blocker_note` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `jobs_organization_idx` ON `jobs` (`organization_id`);--> statement-breakpoint
CREATE TABLE `labor_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`job_id` text NOT NULL,
	`user_id` text NOT NULL,
	`work_date` text NOT NULL,
	`kind` text NOT NULL,
	`minutes` integer,
	`quantity` integer,
	`unit` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "labor_entries_kind_valid" CHECK("labor_entries"."kind" IN ('hourly', 'piece')),
	CONSTRAINT "labor_entries_measure_valid" CHECK((
        "labor_entries"."kind" = 'hourly'
        AND "labor_entries"."minutes" > 0
        AND "labor_entries"."minutes" <= 1440
        AND "labor_entries"."quantity" IS NULL
        AND "labor_entries"."unit" = ''
      ) OR (
        "labor_entries"."kind" = 'piece'
        AND "labor_entries"."quantity" > 0
        AND "labor_entries"."minutes" IS NULL
        AND "labor_entries"."unit" IN ('bags', 'sq_ft')
      ))
);
--> statement-breakpoint
CREATE INDEX `labor_entries_day_idx` ON `labor_entries` (`organization_id`,`work_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `labor_entries_slot_unique` ON `labor_entries` (`organization_id`,`job_id`,`user_id`,`work_date`,`kind`,`unit`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`status` text NOT NULL,
	`booking_status` text NOT NULL,
	`notify_status` text NOT NULL,
	`workflow_status` text DEFAULT 'new' NOT NULL,
	`assigned_to` text,
	`next_action` text,
	`next_action_due_at` integer,
	`lost_reason` text,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`company` text NOT NULL,
	`project_type` text NOT NULL,
	`city` text NOT NULL,
	`province` text NOT NULL,
	`services` text NOT NULL,
	`answers` text NOT NULL,
	`recommended_services` text NOT NULL,
	`files` text NOT NULL,
	`source_path` text,
	`utm` text,
	`referrer` text,
	`idempotency_key` text NOT NULL,
	`calendly_invitee_uri` text,
	`consent_at` integer NOT NULL,
	`company_id` text,
	`contact_id` text,
	`site_id` text,
	`opportunity_id` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_idempotency_key_unique` ON `leads` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `leads_organization_idx` ON `leads` (`organization_id`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "memberships_role_valid" CHECK("memberships"."role" IN ('administrator', 'office', 'field_lead', 'field_worker'))
);
--> statement-breakpoint
CREATE INDEX `memberships_user_idx` ON `memberships` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `memberships_organization_user_unique` ON `memberships` (`organization_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`company_id` text,
	`contact_id` text,
	`site_id` text,
	`source_lead_id` text,
	`name` text NOT NULL,
	`stage` text DEFAULT 'qualification' NOT NULL,
	`owner` text,
	`source` text,
	`services` text NOT NULL,
	`project_type` text,
	`project_id` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `opportunities_organization_idx` ON `opportunities` (`organization_id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `outbox_events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`kind` text NOT NULL,
	`aggregate_type` text NOT NULL,
	`aggregate_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`payload` text NOT NULL,
	`published_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `outbox_events_unpublished_idx` ON `outbox_events` (`organization_id`,`published_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `outbox_events_organization_idempotency_unique` ON `outbox_events` (`organization_id`,`idempotency_key`);--> statement-breakpoint
CREATE TABLE `price_book_item_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`item_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`created_at` integer NOT NULL,
	`trade` text NOT NULL,
	`description` text NOT NULL,
	`unit` text NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`unit_cost_cents` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`effective_at` integer,
	`created_by` text NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`content_hash` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `price_book_items`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "price_book_item_versions_status_valid" CHECK("price_book_item_versions"."status" IN ('draft', 'approved')),
	CONSTRAINT "price_book_item_versions_trade_valid" CHECK("price_book_item_versions"."trade" IN ('spray-foam', 'fireproofing', 'intumescent', 'avb', 'spf-roofing')),
	CONSTRAINT "price_book_item_versions_unit_valid" CHECK("price_book_item_versions"."unit" IN ('bags', 'sq_ft', 'hour', 'each')),
	CONSTRAINT "price_book_item_versions_price_valid" CHECK("price_book_item_versions"."unit_price_cents" >= 0 AND "price_book_item_versions"."unit_price_cents" <= 100000000),
	CONSTRAINT "price_book_item_versions_cost_valid" CHECK("price_book_item_versions"."unit_cost_cents" IS NULL OR ("price_book_item_versions"."unit_cost_cents" >= 0 AND "price_book_item_versions"."unit_cost_cents" <= 100000000))
);
--> statement-breakpoint
CREATE INDEX `price_book_item_versions_item_idx` ON `price_book_item_versions` (`organization_id`,`item_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `price_book_item_versions_item_version_unique` ON `price_book_item_versions` (`item_id`,`version_number`);--> statement-breakpoint
CREATE TABLE `price_book_items` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`trade` text NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`item_code` text,
	`item_kind` text,
	`supplier` text,
	`unit_cost_cents` integer,
	`active` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`current_approved_version_id` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "price_book_items_trade_valid" CHECK("price_book_items"."trade" IN ('spray-foam', 'fireproofing', 'intumescent', 'avb', 'spf-roofing')),
	CONSTRAINT "price_book_items_unit_valid" CHECK("price_book_items"."unit" IN ('bags', 'sq_ft', 'hour', 'each')),
	CONSTRAINT "price_book_items_price_valid" CHECK("price_book_items"."unit_price_cents" >= 0 AND "price_book_items"."unit_price_cents" <= 100000000),
	CONSTRAINT "price_book_items_kind_valid" CHECK("price_book_items"."item_kind" IS NULL OR "price_book_items"."item_kind" IN ('material', 'labour', 'equipment')),
	CONSTRAINT "price_book_items_cost_valid" CHECK("price_book_items"."unit_cost_cents" IS NULL OR ("price_book_items"."unit_cost_cents" >= 0 AND "price_book_items"."unit_cost_cents" <= 100000000))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_book_items_org_item_code_unique` ON `price_book_items` (`organization_id`,`item_code`) WHERE "price_book_items"."item_code" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `price_book_items_organization_idx` ON `price_book_items` (`organization_id`);--> statement-breakpoint
CREATE INDEX `price_book_items_trade_name_idx` ON `price_book_items` (`trade`,`name`);--> statement-breakpoint
CREATE TABLE `production_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`production_entry_id` text NOT NULL,
	`user_id` text NOT NULL,
	`quantity` integer NOT NULL,
	FOREIGN KEY (`production_entry_id`) REFERENCES `production_entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "production_allocations_quantity_valid" CHECK("production_allocations"."quantity" > 0 AND "production_allocations"."quantity" <= 1000000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `production_allocations_entry_user_unique` ON `production_allocations` (`production_entry_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `production_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`job_id` text NOT NULL,
	`work_date` text NOT NULL,
	`task_id` text,
	`work_area_id` text,
	`trade` text NOT NULL,
	`work_type` text NOT NULL,
	`unit` text NOT NULL,
	`quantity` integer NOT NULL,
	`attribution_mode` text NOT NULL,
	`status` text NOT NULL,
	`recorded_by` text NOT NULL,
	`verified_by` text,
	`verified_at` integer,
	`source_type` text,
	`source_id` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `job_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`work_area_id`) REFERENCES `work_areas`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "production_entries_unit_valid" CHECK("production_entries"."unit" IN ('bags', 'sq_ft')),
	CONSTRAINT "production_entries_quantity_valid" CHECK("production_entries"."quantity" > 0 AND "production_entries"."quantity" <= 1000000),
	CONSTRAINT "production_entries_mode_valid" CHECK("production_entries"."attribution_mode" IN ('crew', 'individual')),
	CONSTRAINT "production_entries_status_valid" CHECK("production_entries"."status" IN ('draft', 'verified', 'void'))
);
--> statement-breakpoint
CREATE INDEX `production_entries_day_idx` ON `production_entries` (`organization_id`,`work_date`);--> statement-breakpoint
CREATE TABLE `production_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`production_entry_id` text NOT NULL,
	`user_id` text NOT NULL,
	`labor_entry_id` text,
	FOREIGN KEY (`production_entry_id`) REFERENCES `production_entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`labor_entry_id`) REFERENCES `labor_entries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `production_participants_labor_unique` ON `production_participants` (`labor_entry_id`) WHERE "production_participants"."labor_entry_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `production_participants_entry_user_unique` ON `production_participants` (`production_entry_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `production_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`trade` text NOT NULL,
	`work_type` text NOT NULL,
	`unit` text NOT NULL,
	`basis` text NOT NULL,
	`rate_milli` integer NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`approved_by` text NOT NULL,
	`approved_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "production_targets_unit_valid" CHECK("production_targets"."unit" IN ('bags', 'sq_ft')),
	CONSTRAINT "production_targets_basis_valid" CHECK("production_targets"."basis" IN ('crew_hour', 'person_hour')),
	CONSTRAINT "production_targets_rate_positive" CHECK("production_targets"."rate_milli" > 0)
);
--> statement-breakpoint
CREATE INDEX `production_targets_class_idx` ON `production_targets` (`organization_id`,`trade`,`work_type`,`unit`,`basis`);--> statement-breakpoint
CREATE UNIQUE INDEX `production_targets_one_open` ON `production_targets` (`organization_id`,`trade`,`work_type`,`unit`,`basis`) WHERE "production_targets"."effective_to" IS NULL;--> statement-breakpoint
CREATE TABLE `project_budget_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`budget_id` text NOT NULL,
	`estimate_line_id` text NOT NULL,
	`estimate_version_id` text NOT NULL,
	`price_book_version_id` text,
	`description` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`budget_id`) REFERENCES `project_budgets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estimate_line_id`) REFERENCES `estimate_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estimate_version_id`) REFERENCES `estimate_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`price_book_version_id`) REFERENCES `price_book_item_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `project_budget_lines_budget_idx` ON `project_budget_lines` (`organization_id`,`budget_id`);--> statement-breakpoint
CREATE TABLE `project_budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`project_id` text NOT NULL,
	`estimate_version_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`total_cents` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estimate_version_id`) REFERENCES `estimate_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `project_budgets_organization_idx` ON `project_budgets` (`organization_id`,`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_budgets_project_unique` ON `project_budgets` (`project_id`);--> statement-breakpoint
CREATE TABLE `project_schedule_baseline_items` (
	`id` text PRIMARY KEY NOT NULL,
	`baseline_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`planned_start_at` integer,
	`planned_end_at` integer,
	`due_at` integer,
	FOREIGN KEY (`baseline_id`) REFERENCES `project_schedule_baselines`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "project_schedule_baseline_items_entity_type" CHECK("project_schedule_baseline_items"."entity_type" IN ('job', 'task'))
);
--> statement-breakpoint
CREATE INDEX `project_schedule_baseline_items_baseline_idx` ON `project_schedule_baseline_items` (`baseline_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_schedule_baseline_items_entity_unique` ON `project_schedule_baseline_items` (`baseline_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `project_schedule_baselines` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`captured_at` integer NOT NULL,
	`captured_by` text NOT NULL,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_schedule_baselines_project_idx` ON `project_schedule_baselines` (`project_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`company_id` text,
	`site_id` text,
	`opportunity_id` text,
	`source_lead_id` text,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`project_manager` text,
	`schedule_calendar_id` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`schedule_calendar_id`) REFERENCES `schedule_calendars`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `projects_organization_idx` ON `projects` (`organization_id`);--> statement-breakpoint
CREATE TABLE `proposal_events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`proposal_id` text NOT NULL,
	`kind` text NOT NULL,
	`actor_email` text,
	`recipient_name` text,
	`recipient_email` text,
	`channel` text,
	`external_message_id` text,
	`attestation` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "proposal_events_kind_valid" CHECK("proposal_events"."kind" IN ('generated', 'delivered', 'viewed', 'accepted', 'rejected', 'expired', 'revoked'))
);
--> statement-breakpoint
CREATE INDEX `proposal_events_proposal_idx` ON `proposal_events` (`organization_id`,`proposal_id`);--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`estimate_id` text NOT NULL,
	`estimate_version_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`content_hash` text NOT NULL,
	`pdf_sha256` text NOT NULL,
	`pdf_base64` text NOT NULL,
	`token_hash` text NOT NULL,
	`public_snapshot` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estimate_id`) REFERENCES `estimates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estimate_version_id`) REFERENCES `estimate_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `proposals_estimate_idx` ON `proposals` (`organization_id`,`estimate_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `proposals_token_hash_unique` ON `proposals` (`token_hash`);--> statement-breakpoint
CREATE TABLE `purchase_order_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`purchase_order_id` text NOT NULL,
	`material_request_id` text NOT NULL,
	`active_material_request_id` text,
	`description` text NOT NULL,
	`quantity` integer,
	`unit` text DEFAULT '' NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`material_request_id`) REFERENCES `job_field_notes`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "purchase_order_lines_claim_valid" CHECK("purchase_order_lines"."active_material_request_id" IS NULL OR "purchase_order_lines"."active_material_request_id" = "purchase_order_lines"."material_request_id"),
	CONSTRAINT "purchase_order_lines_unit_valid" CHECK("purchase_order_lines"."unit" IN ('', 'board_feet', 'sq_ft', 'linear_ft', 'bags', 'hours')),
	CONSTRAINT "purchase_order_lines_measure_valid" CHECK((
        "purchase_order_lines"."quantity" IS NULL AND "purchase_order_lines"."unit" = ''
      ) OR (
        "purchase_order_lines"."quantity" > 0
        AND "purchase_order_lines"."quantity" <= 1000000
        AND "purchase_order_lines"."unit" IN ('board_feet', 'sq_ft', 'linear_ft', 'bags', 'hours')
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_order_lines_active_request_idx` ON `purchase_order_lines` (`organization_id`,`active_material_request_id`) WHERE "purchase_order_lines"."active_material_request_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `purchase_order_lines_order_idx` ON `purchase_order_lines` (`purchase_order_id`);--> statement-breakpoint
CREATE INDEX `purchase_order_lines_request_idx` ON `purchase_order_lines` (`material_request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_order_lines_order_request_unique` ON `purchase_order_lines` (`purchase_order_id`,`material_request_id`);--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`job_id` text NOT NULL,
	`supplier` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "purchase_orders_status_valid" CHECK("purchase_orders"."status" IN ('draft', 'ordered', 'cancelled'))
);
--> statement-breakpoint
CREATE INDEX `purchase_orders_job_idx` ON `purchase_orders` (`organization_id`,`job_id`);--> statement-breakpoint
CREATE INDEX `purchase_orders_draft_idx` ON `purchase_orders` (`organization_id`,`job_id`) WHERE "purchase_orders"."status" = 'draft';--> statement-breakpoint
CREATE TABLE `schedule_calendar_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL,
	`calendar_id` text NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL,
	`is_working_day` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`calendar_id`) REFERENCES `schedule_calendars`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `schedule_calendar_exceptions_calendar_idx` ON `schedule_calendar_exceptions` (`calendar_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `schedule_calendar_exceptions_calendar_date_unique` ON `schedule_calendar_exceptions` (`calendar_id`,`date`);--> statement-breakpoint
CREATE TABLE `schedule_calendars` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL,
	`name` text NOT NULL,
	`time_zone` text NOT NULL,
	`weekend_days` text DEFAULT '[0,6]' NOT NULL,
	`is_default` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `schedule_calendars_single_default_idx` ON `schedule_calendars` (`is_default`) WHERE "schedule_calendars"."is_default";--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`company_id` text,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`province` text NOT NULL,
	`address_line` text,
	`postal_code` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sites_organization_idx` ON `sites` (`organization_id`);--> statement-breakpoint
CREATE TABLE `user_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`user_id` text NOT NULL,
	`actor` text NOT NULL,
	`kind` text NOT NULL,
	`summary` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `user_events_user_created_idx` ON `user_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`session_version` integer DEFAULT 1 NOT NULL,
	`created_by` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `work_areas` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`job_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'area' NOT NULL,
	`notes` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_areas_id_job_id_unique` ON `work_areas` (`id`,`job_id`);
--> statement-breakpoint
INSERT INTO `organizations` (`id`, `created_at`, `updated_at`, `name`, `slug`) VALUES ('00000000-0000-4000-8000-000000000001', CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000, 'Strong Foam Insulation', 'strong-foam');
