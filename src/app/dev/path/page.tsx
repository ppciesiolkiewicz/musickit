import DevShell from "@/features/devtools/DevShell";
import { pathNodes } from "@/features/devtools/model/path";
import { blockCounts } from "@/features/devtools/model/stepBlocks";
import { spareSteps } from "@/features/devtools/model/steps";
import PathView from "@/features/devtools/path/PathView";

// Built on the server so the course (large) stays out of the browser; the view gets plain nodes, and how many blocks
// practise each step (the blocks open on /dev/block). `?concept=<id>` opens on that concept, as /dev/examples links to it.
export default async function DevPathPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { concept } = await searchParams;
  return <DevShell wide><PathView nodes={[...pathNodes().values()]} spare={spareSteps()} blocks={blockCounts()} initial={typeof concept === "string" ? concept : undefined} /></DevShell>;
}
