import type { Metadata } from "next";
import ContentShell from "@/features/devtools/ContentShell";
import { contentTitle } from "@/features/devtools/registry";
import { listContentVideos } from "@/features/contentVideos/server/access";
import { contentVideos } from "@/features/contentVideos/server/http";
import { seedCells } from "@/features/contentVideos/server/seedCells";
import { videoTools } from "@/features/contentVideos/model/coverage";
import { stepsOfTool } from "@/features/contentVideos/model/slot";
import RecordPage, { type SettingsOption } from "./RecordPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: contentTitle("/admin/content/videos", "Record") };

type Search = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] ?? "" : v ?? "");

/**
 * The record page: `?tool=<key>&steps=<step,…>` records a video for a tool at the levels ticked, `?block=<id>&cell=<n>` one
 * for a seed block's tool cell (This block only, or the tool's levels). The only page that loads the camera and a tool.
 */
export default async function Record({ searchParams }: Search) {
  const q = await searchParams;
  const cells = seedCells();
  const blockId = one(q.block);
  const cellAt = Number(one(q.cell));
  let tool = one(q.tool);
  let block: { id: string; cell: number; title: string } | null = null;
  let options: SettingsOption[];
  if (blockId) {
    const here = cells.filter((c) => c.blockId === blockId && c.cell === cellAt);
    if (!here.length || !Number.isInteger(cellAt)) return <ContentShell wide><p className="text-sm text-rose-300">This exercise has no tool at that place any more. Open Record again from the exercise in the library.</p></ContentShell>;
    tool = here[0].key;
    block = { id: blockId, cell: cellAt, title: here[0].title };
    options = here.map((c) => ({ label: `${c.title} · ${c.choice}`, step: c.step, tool: c.tool }));
  } else {
    if (!videoTools().includes(tool)) return <ContentShell wide><p className="text-sm text-rose-300">There is no tool called “{tool}”. Pick one on Tools videos.</p></ContentShell>;
    options = cells.filter((c) => c.key === tool).map((c) => ({ label: `${c.title} · ${c.choice}`, step: c.step, tool: c.tool }));
  }
  const all = stepsOfTool(tool) ?? [];
  const asked = one(q.steps).split(",").filter((s) => all.includes(s));
  // the seed exercises at the first ticked level first, then the other ticked levels, then the rest
  const rank = (s: string | null) => (s !== null && s === asked[0] ? 0 : s !== null && asked.includes(s) ? 1 : 2);
  options = options.map((o, i) => ({ o, i })).sort((a, b) => rank(a.o.step) - rank(b.o.step) || a.i - b.i).map((x) => x.o);
  const store = contentVideos();
  let videos: Awaited<ReturnType<typeof listContentVideos>> = [];
  let error = store ? "" : "This site has no database, so a take can't be saved here.";
  if (store) {
    try {
      videos = await listContentVideos(store.repo);
    } catch (e) {
      console.error("content-videos: list failed", e);
      error = "The videos could not be loaded, so the page can't say which video loses a level.";
    }
  }
  return <ContentShell wide><RecordPage target={{ tool, steps: asked, block }} options={options} videos={videos} error={error} /></ContentShell>;
}
