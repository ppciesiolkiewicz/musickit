"use client";

import { useState } from "react";
import Link from "next/link";
import { Tool } from "@/features/plan/ui/ExerciseTool";
import type { PlanTool } from "@/features/plan/model/tools";
import RecordVideo, { type RecordFor } from "@/features/contentVideos/ui/RecordVideo";
import { stepGroups, toolName } from "@/features/contentVideos/model/coverage";
import type { ContentVideoInfo } from "@/features/contentVideos/server/access";

/** One set-up of the tool to draw over the camera: a seed exercise that uses it, and the level it is at there. */
export interface SettingsOption { label: string; step: string | null; tool: PlanTool }

/** The record page in the browser: which seed exercise's settings the tool is drawn with, then the recorder with the tool over the camera. */
export default function RecordPage({ target, options, videos, error }: { target: RecordFor; options: SettingsOption[]; videos: ContentVideoInfo[]; error: string }) {
  const [picked, setPicked] = useState(0);
  const names = new Map(stepGroups(target.tool).flatMap((g) => g.steps.map((s) => [s.step, s.name])));
  const option = options[picked];
  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-mono text-lg text-slate-100">Record · {toolName(target.tool)}</h2>
        <Link href={`/admin/content/videos#${encodeURIComponent(target.tool)}`} className="text-sm text-sky-400 hover:underline">Back to Tools videos</Link>
      </header>
      {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
      {options.length > 1 && (
        <label className="flex max-w-3xl flex-col gap-1 text-xs text-slate-400">Settings of the tool over the camera, from a seed exercise
          <select value={picked} onChange={(e) => setPicked(Number(e.target.value))} className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200">
            {options.map((o, i) => <option key={i} value={i}>{o.label}{o.step !== null ? ` · ${names.get(o.step) ?? o.step}` : ""}</option>)}
          </select>
        </label>
      )}
      {/* the tool as written, not in the recorder's own voice: the melody drawn over the video is the one sung here */}
      <RecordVideo target={target} videos={videos} drawn={option?.tool ?? null}>
        {option ? <Tool key={picked} tool={option.tool} /> : <p className="text-sm text-slate-300">No seed exercise uses this tool, so there is no tool to show over the camera. The video records without it.</p>}
      </RecordVideo>
    </div>
  );
}
