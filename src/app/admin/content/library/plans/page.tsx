import type { Metadata } from "next";
import ContentShell from "@/features/devtools/ContentShell";
import { PlansPage } from "@/features/devtools/library/LibraryPage";
import { loadItem } from "@/features/devtools/library/load";
import { allowedParams, readParams } from "@/features/devtools/library/params";
import { openPermissions } from "@/features/devtools/server/access";
import { contentTitle } from "@/features/devtools/registry";
import { getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

type Search = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The open plan, else "Plans", leads the tab title. */
export async function generateMetadata({ searchParams }: Search): Promise<Metadata> {
  const p = readParams(await searchParams);
  return { title: contentTitle("/admin/content/library", p.item ?? "Plans") };
}

export default async function Page({ searchParams }: Search) {
  const params = allowedParams(readParams(await searchParams), await openPermissions());
  return <ContentShell wide><PlansPage item={await loadItem(getDb(), params)} params={params} /></ContentShell>;
}
