CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`pos_customer_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_pos_customer_id_unique` ON `customers` (`pos_customer_id`);--> statement-breakpoint
CREATE TABLE `service_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer NOT NULL,
	`service_date` text NOT NULL,
	`service_type` text NOT NULL,
	`formula_json` text,
	`perm_map_json` text,
	`technical_notes` text,
	`amount` integer,
	`pos_transaction_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_records_pos_transaction_id_unique` ON `service_records` (`pos_transaction_id`);