CREATE TABLE `media` (
	`key` text PRIMARY KEY NOT NULL,
	`content_type` text NOT NULL,
	`data` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
