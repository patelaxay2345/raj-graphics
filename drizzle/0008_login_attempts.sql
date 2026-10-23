CREATE TABLE `login_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ip` text NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `login_attempts_ip_at` ON `login_attempts` (`ip`,`at`);--> statement-breakpoint
CREATE INDEX `login_attempts_at` ON `login_attempts` (`at`);