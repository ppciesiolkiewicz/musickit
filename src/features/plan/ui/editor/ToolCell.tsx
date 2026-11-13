"use client";

import { useContext, useState, type ReactNode } from "react";
import { VideoPickContext } from "@/features/stage/render/VideoPickContext";
import { VideoPlaceholderButton } from "@/features/videos/Placeholder";
import { parseToolDiag, type PlanTool } from "../../model/tools";
import ExerciseTool from "../ExerciseTool";

type Tab = "settings" | "json";
const tabClass = (on: boolean) => `rounded-md px-2.5 py-1 text-xs font-medium ${on ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-200"}`;

/**
 * A tool cell being written: the tool as the student will see it, and under it two tabs. Settings is the teacher's door (the
 * family's few controls, from the host); JSON is the whole tool, applied when the box is left and it reads, with what the parser
 * says. A placeholder video opens the host's Add a video and takes the video picked.
 */
export default function ToolCell({ tool, controls, onChange }: { tool: PlanTool; controls: ReactNode | null; onChange: (tool: PlanTool) => void }) {
  const [tab, setTab] = useState<Tab>("settings");
  const pickVideo = useContext(VideoPickContext);
  const placeholder = tool.type === "video" && tool.ref?.source === "placeholder" && pickVideo;
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl bg-slate-950 p-3 ring-1 ring-slate-800">
        {placeholder ? (
          <VideoPlaceholderButton
            onOpen={() =>
              pickVideo((video) => {
                const next = parseToolDiag(video.source === "library" ? { type: "video", video: video.id } : { type: "video", ref: video }, { stored: true }).tool;
                if (next) onChange(next);
              })
            }
          />
        ) : (
          <ExerciseTool tool={tool} />
        )}
      </div>
      <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/40 p-2" data-chrome>
        <div role="tablist" className="flex gap-1">
          <button type="button" role="tab" aria-selected={tab === "settings"} className={tabClass(tab === "settings")} onClick={() => setTab("settings")}>Settings</button>
          <button type="button" role="tab" aria-selected={tab === "json"} className={tabClass(tab === "json")} onClick={() => setTab("json")}>JSON</button>
        </div>
        {tab === "settings" ? (controls ?? <p className="px-1 text-xs text-slate-500">This widget has no settings here. Use JSON to change it.</p>) : <ToolJson tool={tool} onChange={onChange} />}
      </div>
    </div>
  );
}

/** The tool's JSON: edited freely, applied on leaving the box when it reads, the parser's notes under it. */
function ToolJson({ tool, onChange }: { tool: PlanTool; onChange: (tool: PlanTool) => void }) {
  const written = JSON.stringify(tool, null, 2);
  const [text, setText] = useState(written);
  const [focused, setFocused] = useState(false);
  // a change from elsewhere (the key bar, Settings) shows here unless the box is being typed in, so leaving it never undoes that change
  const [seen, setSeen] = useState(written);
  if (written !== seen && !focused) {
    setSeen(written);
    setText(written);
  }
  const [said, setSaid] = useState<string[]>([]);
  const apply = () => {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      setSaid(["This isn't JSON yet. Check the brackets and quotes."]);
      return;
    }
    const p = parseToolDiag(raw, { stored: true });
    setSaid(p.tool ? p.notes : [`Not applied: ${p.dropped}.`]);
    if (p.tool && JSON.stringify(p.tool) !== JSON.stringify(tool)) onChange(p.tool);
  };
  return (
    <div className="flex flex-col gap-1">
      <textarea value={text} onChange={(e) => setText(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); apply(); }} spellCheck={false} aria-label="The tool as JSON" rows={Math.min(14, text.split("\n").length)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-100 outline-none focus:border-sky-500" />
      {said.map((s) => <p key={s} className="text-xs text-amber-300">{s}</p>)}
    </div>
  );
}
