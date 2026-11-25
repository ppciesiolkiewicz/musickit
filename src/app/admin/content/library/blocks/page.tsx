import type { Metadata } from "next";
import ContentShell from "@/features/devtools/ContentShell";
import { BlocksPage } from "@/features/devtools/library/LibraryPage";
import { loadBlocks, loadItem } from "@/features/devtools/library/load";
import { allowedParams, canNamePlayer, readParams } from "@/features/devtools/library/params";
import { openPermissions } from "@/features/devtools/server/access";
import { contentTitle } from "@/features/devtools/registry";
import { getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

type Search = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The open block, else the topic, else "Blocks", leads the tab title. */
export async function generateMetadata({ searchParams }: Search): Promise<Metadata> {
  const p = readParams(await searchParams);
  return { title: contentTitle("/admin/content/library", p.item ?? p.topic ?? "Blocks") };
}

export default async function Page({ searchParams }: Search) {
  const open = await openPermissions();
  const params = allowedParams(readParams(await searchParams), open);
  const db = getDb();
  const [result, item] = await Promise.all([loadBlocks(db, params), loadItem(db, params)]);
  return <ContentShell wide><BlocksPage result={result} item={item} params={params} canNamePlayer={canNamePlayer(open)} /></ContentShell>;
}
