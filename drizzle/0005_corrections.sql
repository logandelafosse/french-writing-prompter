ALTER TABLE `sessions` ADD `evaluation_raw` text;--> statement-breakpoint
CREATE TABLE `corrections` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` integer NOT NULL REFERENCES `sessions`(`id`) ON DELETE CASCADE,
	`ordinal` integer NOT NULL,
	`kind` text NOT NULL,
	`category` text,
	`quote` text NOT NULL,
	`span_start` integer,
	`span_end` integer,
	`anchor` text NOT NULL,
	`suggestion` text NOT NULL,
	`explanation` text NOT NULL,
	`question` text,
	`rule_if_dialect` text,
	`dlf_entry_id` text,
	`dlf_headword` text,
	`resource_ids_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`dialect_note_id` integer,
	`created_at` text NOT NULL,
	`resolved_at` text
);--> statement-breakpoint
CREATE INDEX `corrections_session_idx` ON `corrections` (`session_id`);--> statement-breakpoint
CREATE INDEX `corrections_cat_idx` ON `corrections` (`category`,`kind`,`status`);
