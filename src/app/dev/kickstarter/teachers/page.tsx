import { drizzleRepo } from "@/features/account/server/repo.drizzle";
import DevShell from "@/features/devtools/DevShell";
import KickstarterNav from "@/features/devtools/kickstarter/KickstarterNav";
import KickstarterPage from "@/features/devtools/kickstarter/KickstarterPage";
import { TEACHER_DEMOS } from "@/features/devtools/kickstarter/demos";
import { getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/** /dev/kickstarter/teachers: the brief for a founding-partner email to a teacher or a school. */
export default async function KickstarterTeachers() {
  const db = getDb();
  const plans = db ? await drizzleRepo(db).listPlans() : null;
  return <DevShell><KickstarterNav /><KickstarterPage demos={TEACHER_DEMOS} plans={plans} /></DevShell>;
}
