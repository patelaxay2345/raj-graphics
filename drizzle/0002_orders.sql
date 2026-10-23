CREATE TABLE `counters` (
	`series` text PRIMARY KEY NOT NULL,
	`next` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone` text NOT NULL,
	`name` text NOT NULL,
	`business` text DEFAULT '' NOT NULL,
	`gstin` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_phone_unique` ON `customers` (`phone`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`service` text NOT NULL,
	`specs` text NOT NULL,
	`qty` integer NOT NULL,
	`unit` text NOT NULL,
	`rate` integer NOT NULL,
	`hsn` text DEFAULT '' NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `order_items_order_sort` ON `order_items` (`order_id`,`sort`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no` integer NOT NULL,
	`customer_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`due_on` text,
	`delivery_mode` text DEFAULT 'pickup' NOT NULL,
	`design_by` text DEFAULT 'we' NOT NULL,
	`proof_by` text DEFAULT 'whatsapp' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`gst_rate` integer DEFAULT 18 NOT NULL,
	`subtotal` integer NOT NULL,
	`tax` integer NOT NULL,
	`total` integer NOT NULL,
	`advance` integer DEFAULT 0 NOT NULL,
	`pay_mode` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`done_at` integer,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_no_unique` ON `orders` (`no`);--> statement-breakpoint
CREATE INDEX `orders_status_due` ON `orders` (`status`,`due_on`);--> statement-breakpoint
CREATE INDEX `orders_customer` ON `orders` (`customer_id`);