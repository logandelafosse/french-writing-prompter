CREATE TABLE `placement_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text NOT NULL,
	`step` integer NOT NULL,
	`final_level` text,
	`started_at` text NOT NULL,
	`completed_at` text
);--> statement-breakpoint
ALTER TABLE `sessions` ADD `placement_run_id` integer;--> statement-breakpoint
ALTER TABLE `sessions` ADD `placement_step` integer;
