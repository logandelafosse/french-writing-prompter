ALTER TABLE `sessions` ADD `kind` text DEFAULT 'daily' NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `local_date` text;--> statement-breakpoint
CREATE INDEX `sessions_quota_idx` ON `sessions` (`kind`,`local_date`);--> statement-breakpoint
DROP TABLE `daily_quota`;