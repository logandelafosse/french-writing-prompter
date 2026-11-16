ALTER TABLE `corrections` ADD `context_quote` text;--> statement-breakpoint
ALTER TABLE `corrections` ADD `dialect_example` text;--> statement-breakpoint
ALTER TABLE `corrections` ADD `dialect_lemma` text;--> statement-breakpoint
ALTER TABLE `corrections` ADD `dialect_pattern` text;--> statement-breakpoint
CREATE TABLE `dialect_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rule` text NOT NULL,
	`example` text,
	`scope` text NOT NULL,
	`form` text NOT NULL,
	`learner_form` text,
	`tutor_suggestion` text,
	`source_session_id` integer,
	`source_correction_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
