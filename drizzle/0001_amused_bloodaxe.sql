CREATE TABLE `service_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_name` text NOT NULL,
	`service_date` text NOT NULL,
	`photo_kind` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_photo_slot_idx` ON `service_photos` (`customer_name`,`service_date`,`photo_kind`);