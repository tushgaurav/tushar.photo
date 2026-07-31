ALTER TABLE "photos" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "blur_data_url" text DEFAULT '' NOT NULL;