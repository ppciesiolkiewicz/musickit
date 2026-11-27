"use client";

import { useEffect, useState } from "react";
import { devUi } from "@/features/devtools/gate";
import type { SeedVersions } from "@/features/library/seed";

interface VersionsMap {
  now: { prompt: number; agents: number; teaching: number };
  blocks: Record<string, SeedVersions>;
}

/** One request per page, shared by every card; null when it failed (the dev line just doesn't show). */
let asked: Promise<VersionsMap | null> | null = null;
const load = (): Promise<VersionsMap | null> =>
  (asked ??= fetch("/api/dev/block-versions", { signal: AbortSignal.timeout(10_000) })
    .then((r) => (r.ok ? (r.json() as Promise<VersionsMap>) : null))
    .catch((e) => {
      console.error("[block-versions] could not load", e);
      return null;
    }));

/**
 * In development only (`devUi`): the seed block's id and the versions its file was written to, each behind one shown
 * with the version now (`teaching 5 → 12`), in the fuchsia of the other dev marks. Nothing for a block that isn't a seed file.
 */
export default function BlockVersions({ blockId }: { blockId?: string }) {
  const [map, setMap] = useState<VersionsMap | null>(null);
  const on = devUi() && !!blockId;
  useEffect(() => {
    if (!on) return;
    let live = true;
    load().then((m) => live && setMap(m));
    return () => {
      live = false;
    };
  }, [on]);
  const v = on && map ? map.blocks[blockId!] : undefined;
  if (!v || !map) return null;
  const parts: [string, number | null, number][] = [["prompt", v.prompt, map.now.prompt], ["agents", v.agents, map.now.agents], ["teaching", v.teaching, map.now.teaching]];
  return (
    <span className="flex min-w-0 flex-wrap items-baseline gap-1.5 font-mono text-[10px]">
      <span className="rounded bg-fuchsia-500/15 px-1.5 py-0.5 text-fuchsia-300">{blockId}</span>
      {parts.map(([name, was, now]) => (
        <span key={name} className={was === now ? "text-fuchsia-300/60" : "text-amber-300"}>
          {name} {was ?? "—"}{was !== now ? ` → ${now}` : ""}
        </span>
      ))}
    </span>
  );
}
