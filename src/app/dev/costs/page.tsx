import type { Metadata } from "next";
import { devTitle } from "@/features/devtools/registry";
import { drizzleRepo } from "@/features/account/server/repo.drizzle";
import DevShell from "@/features/devtools/DevShell";
import CostsPage from "@/features/devtools/costs/CostsPage";
import PUBLISHED from "@/features/devtools/compare/published.json";
import type { RunSummary } from "@/features/devtools/model/history";
import { planTokens } from "@/features/devtools/model/unitEconomics";
import { getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: devTitle("/dev/costs") };

export default async function Costs() {
  const db = getDb();
  const plans = db ? await drizzleRepo(db).listPlans() : null;
  return <DevShell><CostsPage planTokens={planTokens(PUBLISHED.runs as RunSummary[])} plans={plans} /></DevShell>;
}
