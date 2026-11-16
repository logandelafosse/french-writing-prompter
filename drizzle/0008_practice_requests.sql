CREATE TABLE `practice_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`created_at` text NOT NULL,
	`consumed_session_id` integer,
	`cancelled_at` text
);
