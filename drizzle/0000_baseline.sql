CREATE TABLE IF NOT EXISTS `daily_quota` (
	`date` text PRIMARY KEY NOT NULL,
	`used_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `level_changes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_level` text,
	`to_level` text NOT NULL,
	`source` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prompt_text` text NOT NULL,
	`prompt_constraints` text NOT NULL,
	`writing_text` text,
	`evaluation_json` text,
	`cefr_level` text,
	`created_at` text NOT NULL
);