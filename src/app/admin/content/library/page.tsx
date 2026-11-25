import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ContentShell from "@/features/devtools/ContentShell";
import { OverviewPage } from "@/features/devtools/library/LibraryPage";
import { loadCoverage } from "@/features/devtools/library/load";
import { allowedParams, canNamePlayer, itemRedirect, readParams } from "@/features/devtools/library/params";
import { openPermissions } from "@/features/devtools/server/access";
import { contentTitle } from "@/features/devtools/registry";
import { getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: contentTitle("/admin/content/library") };

type Raw = Record<string, string | string[] | undefined>;

/** The library's overview. An older `?item=<id>` link (seed files, section notes) goes on to the item's subpage. */
export default async function Page({ searchParams }: { searchParams: Promise<Raw> }) {
  const raw = await searchParams;
  const to = itemRedirect(raw);
  if (to) redirect(to);
  const open = await openPermissions();
  const params = allowedParams(readParams(raw), open);
  return <ContentShell wide><OverviewPage result={await loadCoverage(getDb(), params)} params={params} canNamePlayer={canNamePlayer(open)} /></ContentShell>;
}
