CREATE TABLE `wd_users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL DEFAULT 'designer',
	`status` text NOT NULL DEFAULT 'pending',
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wd_users_username_unique` ON `wd_users` (`username`);
--> statement-breakpoint
CREATE TABLE `wd_sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO wd_users (id, username, password_hash, role, status, created_at, updated_at) VALUES ('wd-admin-wesley', 'Wesley', 'b4a706b935a49a7b37abc732e9dff55ab50a35ebb8d60e4aa5adf8ec0243a7df', 'admin', 'approved', '2026-09-14T00:00:00.000Z', '2026-09-14T00:00:00.000Z');
