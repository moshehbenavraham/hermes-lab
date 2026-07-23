CREATE TABLE `hermes_events` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`detail` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `hermes_events_kind_created_idx` ON `hermes_events` (`kind`,`created_at`);--> statement-breakpoint
CREATE TABLE `hermes_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`requested_by` text,
	`created_at` text NOT NULL,
	`claimed_at` text,
	`completed_at` text,
	`result_summary` text
);
--> statement-breakpoint
CREATE INDEX `hermes_jobs_status_created_idx` ON `hermes_jobs` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `hermes_snapshots` (
	`profile` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`checksum` text NOT NULL,
	`byte_length` text NOT NULL,
	`updated_at` text NOT NULL
);
