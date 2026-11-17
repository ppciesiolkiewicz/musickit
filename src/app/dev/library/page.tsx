import DevShell from "@/features/devtools/DevShell";
import LibraryPage from "@/features/devtools/library/LibraryPage";
import { loadItem, loadLibrary } from "@/features/devtools/library/load";
import { readParams } from "@/features/devtools/library/params";
import { getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = readParams(await searchParams);
  const db = getDb();
  const [result, item] = await Promise.all([loadLibrary(db, params), loadItem(db, params)]);
  return <DevShell wide><LibraryPage result={result} item={item} params={params} /></DevShell>;
}
