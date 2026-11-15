import DevShell from "@/features/devtools/DevShell";
import PlanReviewsTable from "@/features/devtools/reviews/PlanReviewsTable";
import { drizzleUserDataRepo } from "@/features/userData/server/repo.drizzle";
import { getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export default async function PlanReviewsPage() {
  const db = getDb();
  const reviews = db ? await drizzleUserDataRepo(db).listPlanReviews(500) : null;
  return <DevShell wide><PlanReviewsTable reviews={reviews} /></DevShell>;
}
