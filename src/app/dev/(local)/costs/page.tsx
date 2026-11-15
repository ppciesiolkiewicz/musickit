import { drizzleRepo } from "@/features/account/server/repo.drizzle";
import DevShell from "@/features/devtools/DevShell";
import CostsPage from "@/features/devtools/costs/CostsPage";
import PUBLISHED from "@/features/devtools/compare/published.json";
import type { RunSummary } from "@/features/devtools/model/history";
import { planTokens } from "@/features/devtools/model/unitEconomics";
import { count, eq } from "drizzle-orm";
import type { ReuseInfo } from "@/features/devtools/costs/PlanCosts";
import { getDb, type Db } from "@/lib/db/client";
import { plans as plansTable, practicePlans } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/** The internal reuse numbers, read here and not through the account repo: they never go on a `Plan`. */
async function reuseInfo(db: Db): Promise<ReuseInfo> {
  const [chances, [total], [enabled]] = await Promise.all([
    db.select({ id: plansTable.id, pct: plansTable.newPlanPercent }).from(plansTable),
    db.select({ n: count() }).from(practicePlans),
    db.select({ n: count() }).from(practicePlans).where(eq(practicePlans.enabledForReuse, true)),
  ]);
  return { newPlanPercent: Object.fromEntries(chances.map((c) => [c.id, c.pct])), library: { total: total.n, enabled: enabled.n } };
}

export default async function Costs() {
  const db = getDb();
  const [plans, reuse] = db ? await Promise.all([drizzleRepo(db).listPlans(), reuseInfo(db)]) : [null, null];
  return <DevShell><CostsPage planTokens={planTokens(PUBLISHED.runs as RunSummary[])} plans={plans} reuse={reuse} /></DevShell>;
}
