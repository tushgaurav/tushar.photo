ALTER TABLE "photos" ALTER COLUMN "storage_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "photos" DROP COLUMN "cloudinary_public_id";