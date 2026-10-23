CREATE TABLE `invoice_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`description` text NOT NULL,
	`hsn` text DEFAULT '' NOT NULL,
	`qty` integer NOT NULL,
	`unit` text NOT NULL,
	`rate` integer NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invoice_items_invoice_sort` ON `invoice_items` (`invoice_id`,`sort`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`fy` text,
	`seq` integer,
	`issued_on` text,
	`bill_name` text NOT NULL,
	`bill_gstin` text DEFAULT '' NOT NULL,
	`bill_address` text DEFAULT '' NOT NULL,
	`place_of_supply` text NOT NULL,
	`seller` text,
	`gst_rate` integer NOT NULL,
	`taxable` integer NOT NULL,
	`cgst` integer NOT NULL,
	`sgst` integer NOT NULL,
	`igst` integer NOT NULL,
	`round_off` integer NOT NULL,
	`total` integer NOT NULL,
	`advance` integer DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`paid_at` integer,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_fy_seq` ON `invoices` (`fy`,`seq`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_order` ON `invoices` (`order_id`);--> statement-breakpoint
CREATE INDEX `invoices_status` ON `invoices` (`status`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
