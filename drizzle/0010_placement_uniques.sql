CREATE UNIQUE INDEX `placement_runs_in_progress_idx` ON `placement_runs` (`status`) WHERE `status` = 'in_progress';--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_placement_step_idx` ON `sessions` (`placement_run_id`,`placement_step`) WHERE `placement_run_id` IS NOT NULL;
