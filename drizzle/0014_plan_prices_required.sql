ALTER TABLE "plans" ALTER COLUMN "price_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "period" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "month_cents" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "year_cents" SET NOT NULL;