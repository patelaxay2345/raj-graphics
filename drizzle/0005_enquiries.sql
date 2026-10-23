CREATE TABLE `enquiries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`product` text DEFAULT '' NOT NULL,
	`qty` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `enquiries_status_created` ON `enquiries` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `enquiries_phone_created` ON `enquiries` (`phone`,`created_at`);