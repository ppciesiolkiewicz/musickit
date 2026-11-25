import type { Metadata } from "next";
import { contentTitle } from "@/features/devtools/registry";
import ContentShell from "@/features/devtools/ContentShell";
import { pathNodes } from "@/features/devtools/model/path";
import { blockCounts, genreMarks } from "@/features/devtools/model/stepBlocks";
import { spareSteps } from "@/features/devtools/model/steps";
import PathView from "@/features/devtools/path/PathView";

export const metadata: Metadata = { title: contentTitle("/admin/content/path") };

// Built on the server so the course (large) stays out of the browser; the view gets plain nodes, and how many blocks
// practise each step (the blocks open on /admin/content/block). `?concept=<id>` opens on that concept, as /admin/content/library links to it.
export default async function DevPathPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { concept } = await searchParams;
  return <ContentShell wide><PathView nodes={[...pathNodes().values()]} spare={spareSteps()} blocks={blockCounts()} genres={genreMarks()} initial={typeof concept === "string" ? concept : undefined} /></ContentShell>;
}
