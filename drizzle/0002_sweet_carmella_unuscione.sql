CREATE TABLE `manual_customer_records` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_name` text NOT NULL,
	`service_date` text NOT NULL,
	`service_type` text NOT NULL,
	`details` text NOT NULL,
	`source_key` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `manual_customer_records_source_key_unique` ON `manual_customer_records` (`source_key`);