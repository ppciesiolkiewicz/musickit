"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { listContentVideos, lookUpVideos } from "../client/api";
import OverlayVideo from "./OverlayVideo";
import { levelsText, stepGroups, toolName } from "../model/coverage";
import type { CellVideo } from "../model/lookup";
import type { CellAsk } from "../model/slot";
import type { ContentVideoInfo, PlayInfo } from "../server/access";

/**
 * The library's video strip (/admin/content/library, an exercise opened in its row): under each tool, the video that tool
 * shows players now and where it comes from (this block only, or the tool at its levels), with Play and a Record link
 * to the record page for that block and tool. A tool whose video already showed higher up in the block says so. Nothing
 * records here. `children` gets what to hand the exercise card: `onAsks` (its tools as drawn, so a chip that moves a
 * level moves the strip) and `afterTool`.
 */
export default function LibraryStrip({ blockId, children }: {
  /** a curated (seed) block's id: its own videos count, and Record opens for this block's tool. Absent for a block with no seed file. */
  blockId?: string;
  children: (card: { onAsks: (asks: CellAsk[]) => void; afterTool: (cell: number) => ReactNode }) => ReactNode;
}) {
  const [asks, setAsks] = useState<CellAsk[] | null>(null);
  const [found, setFound] = useState<{ cells: CellVideo[]; videos: Record<string, PlayInfo> } | null>(null);
  const [error, setError] = useState("");
  const [infos, setInfos] = useState<Map<string, ContentVideoInfo>>(new Map());
  const [tries, setTries] = useState(0);
  const key = JSON.stringify(asks);

  useEffect(() => {
    if (!asks) return;
    let gone = false;
    lookUpVideos([{ key: "b", ...(blockId ? { blockId } : {}), cells: asks }]).then(
      (got) => { if (!gone) { setError(""); setFound({ cells: got.blocks.b ?? [], videos: got.videos }); } },
      (e: unknown) => { if (!gone) setError(e instanceof Error ? e.message : String(e)); },
    );
    return () => { gone = true; };
  }, [key, blockId, tries]); // eslint-disable-line react-hooks/exhaustive-deps -- `key` stands for the asks
  // the levels each video covers: only the list has them. Without it the strip names the cell's own level.
  useEffect(() => {
    let gone = false;
    void listContentVideos().then((got) => { if (!gone && got.ok) setInfos(new Map(got.value.map((v) => [v.id, v]))); });
    return () => { gone = true; };
  }, [tries]);

  const onAsks = useCallback((a: CellAsk[]) => setAsks(a), []);
  const afterTool = (cell: number): ReactNode => {
    const ask = asks?.find((a) => a.cell === cell);
    if (!ask) return null;
    const record = blockId
      ? `/admin/content/videos/record?block=${encodeURIComponent(blockId)}&cell=${cell}`
      : `/admin/content/videos/record?tool=${encodeURIComponent(ask.tool)}${ask.step ? `&steps=${encodeURIComponent(ask.step)}` : ""}`;
    const level = ask.step === null ? "" : ` at ${stepGroups(ask.tool).flatMap((g) => g.steps).find((s) => s.step === ask.step)?.name ?? ask.step}`;
    let body: ReactNode;
    if (error) body = <span role="alert" className="text-rose-300">{error} <button type="button" onClick={() => { setError(""); setFound(null); setTries((n) => n + 1); }} className="underline">Try again</button></span>;
    else if (!found) body = <span className="text-slate-500">Looking up the video…</span>;
    else {
      const v = found.cells.find((c) => c.cell === cell);
      const play = v ? found.videos[v.id] : undefined;
      if (!v || !play) body = <span className="text-amber-200">No video for {toolName(ask.tool)}{level}.</span>;
      else if (v.repeat) body = <span className="text-slate-400">Same video as a tool above: “{play.title}”.</span>;
      else {
        const info = infos.get(v.id);
        const from = v.from === "script" ? `Not filmed yet: the script for ${toolName(ask.tool)}` : v.from === "block" ? "For this block only" : `For ${toolName(ask.tool)}${info?.tool ? (info.steps === null ? "" : `, ${levelsText(ask.tool, info.steps)}`) : level}`;
        body = <StripVideo play={play} from={from} />;
      }
    }
    return (
      <div className="-mt-1 mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-dashed border-slate-700 px-2 py-1 text-xs">
        <span className="font-medium uppercase tracking-wide text-slate-500">Video</span>
        {body}
        <Link href={record} className="ml-auto text-sky-400 hover:underline">Record</Link>
      </div>
    );
  };
  return <>{children({ onAsks, afterTool })}</>;
}

/** A video in the strip: its title, where it comes from, and Play, which loads the player only when pressed. */
function StripVideo({ play, from }: { play: PlayInfo; from: string }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <span className="text-slate-200">“{play.title}”</span>
      <span className="text-slate-400">{from}</span>
      <button type="button" onClick={() => { setOpen((o) => !o); setFailed(false); }} className="rounded border border-slate-700 px-1.5 text-slate-300 hover:border-slate-400">{open ? "Hide video" : "Play"}</button>
      {open && (
        <div className="w-full">
          <div className="w-full max-w-xl"><OverlayVideo video={play} autoPlay onError={() => setFailed(true)} className="max-h-80 w-full rounded bg-black" /></div>
          {failed && <p role="alert" className="text-rose-300">The video could not be played. Check your connection, then press Play again.</p>}
        </div>
      )}
    </>
  );
}
