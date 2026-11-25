import type { Metadata } from "next";
import ContentShell from "@/features/devtools/ContentShell";
import LibraryPage from "@/features/devtools/library/LibraryPage";
import { loadItem, loadLibrary } from "@/features/devtools/library/load";
import { readParams } from "@/features/devtools/library/params";
import { contentTitle } from "@/features/devtools/registry";
import { getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

type Search = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The open plan or block, else the topic, leads the tab title. */
export async function generateMetadata({ searchParams }: Search): Promise<Metadata> {
  const p = readParams(await searchParams);
  return { title: contentTitle("/admin/content/library", p.item ?? p.topic) };
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = readParams(await searchParams);
  const db = getDb();
  const [result, item] = await Promise.all([loadLibrary(db, params), loadItem(db, params)]);
  return <ContentShell wide><LibraryPage result={result} item={item} params={params} /></ContentShell>;
}
