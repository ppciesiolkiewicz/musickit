import DevShell from "@/features/devtools/DevShell";
import { pathNodes } from "@/features/devtools/model/path";
import { spareSteps } from "@/features/devtools/model/steps";
import PathView from "@/features/devtools/path/PathView";

// Built on the server so the course (large) stays out of the browser; the view gets plain nodes.
// `?concept=<id>` opens on that concept, as /dev/examples links to it.
export default async function DevPathPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { concept } = await searchParams;
  return <DevShell wide><PathView nodes={[...pathNodes().values()]} spare={spareSteps()} initial={typeof concept === "string" ? concept : undefined} /></DevShell>;
}
