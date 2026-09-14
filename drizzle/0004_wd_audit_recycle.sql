ALTER TABLE manual_customer_records ADD COLUMN deleted_at TEXT;
--> statement-breakpoint
ALTER TABLE service_photos ADD COLUMN deleted_at TEXT;
--> statement-breakpoint
CREATE TABLE `wd_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`created_at` text NOT NULL
);
