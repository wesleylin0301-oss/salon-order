ALTER TABLE manual_customer_records ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE manual_customer_records ADD COLUMN superseded_by TEXT;
--> statement-breakpoint
ALTER TABLE manual_customer_records ADD COLUMN void_reason TEXT;
--> statement-breakpoint
CREATE INDEX `manual_customer_records_status_idx` ON `manual_customer_records` (`status`);
