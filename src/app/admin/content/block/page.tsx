import type { Metadata } from "next";
import ContentShell from "@/features/devtools/ContentShell";
import BlockPage from "@/features/devtools/block/BlockPage";
import { blocksByStep } from "@/features/devtools/model/stepBlocks";
import { contentTitle } from "@/features/devtools/registry";
import { stepAt } from "@/features/plan/model/path";

/** The step's name, or the block id, leads the tab title. */
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const { step, id } = await searchParams;
  const detail = typeof step === "string" ? (stepAt(step)?.step.name ?? step) : typeof id === "string" ? id : undefined;
  return { title: contentTitle("Block", detail) };
}

// `?step=<trackId:n>`: every block in the code for that path step; `?id=<block id>`: that one block. /admin/content/path opens it in
// a new tab. Built on the server so the seed files and examples stay out of the path page's bundle.
export default async function DevBlockPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { step, id } = await searchParams;
  const by = blocksByStep();
  if (typeof step === "string") {
    const at = stepAt(step);
    const info = at && { ref: step, track: at.track.label, name: at.step.name, holds: at.step.holds, level: at.step.level, index: at.index, of: at.track.steps.length };
    return <ContentShell><BlockPage step={info ?? null} blocks={by.get(step) ?? []} asked={step} /></ContentShell>;
  }
  const want = typeof id === "string" ? id : "";
  const one = [...by.values()].flat().find((b) => b.id === want);
  return <ContentShell><BlockPage step={null} blocks={one ? [one] : []} asked={want || "Add ?step=<trackId:n> or ?id=<block id>"} /></ContentShell>;
}
