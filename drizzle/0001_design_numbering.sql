ALTER TABLE `categories` ADD `design_prefix` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `next_design_no` integer DEFAULT 1 NOT NULL;