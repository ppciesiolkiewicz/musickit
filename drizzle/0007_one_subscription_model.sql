-- Every plan uses one model, SUBSCRIPTION_MODEL in src/features/account/plans.ts (Haiku 5.5), so the plans table no longer names one.
ALTER TABLE "plans" DROP COLUMN "plan_model";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "note_model";