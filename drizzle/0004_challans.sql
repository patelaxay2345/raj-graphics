CREATE TABLE `challan_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`challan_id` integer NOT NULL,
	`description` text NOT NULL,
	`qty` integer NOT NULL,
	`unit` text NOT NULL,
	`packing` text DEFAULT '' NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`challan_id`) REFERENCES `challans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `challan_items_challan_sort` ON `challan_items` (`challan_id`,`sort`);--> statement-breakpoint
CREATE TABLE `challans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`fy` text,
	`seq` integer,
	`issued_on` text,
	`deliver_to` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`mode` text NOT NULL,
	`vehicle` text DEFAULT '' NOT NULL,
	`purpose` text DEFAULT 'supply' NOT NULL,
	`returnable` integer DEFAULT false NOT NULL,
	`seller` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`delivered_at` integer,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `challans_fy_seq` ON `challans` (`fy`,`seq`);--> statement-breakpoint
CREATE INDEX `challans_order` ON `challans` (`order_id`);--> statement-breakpoint
CREATE INDEX `challans_status` ON `challans` (`status`);