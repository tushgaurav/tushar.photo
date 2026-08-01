CREATE TABLE "gear_page" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" text DEFAULT '2025' NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"groups" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
