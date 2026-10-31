"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import type { CatalogueEntry } from "@/features/plan/model/catalogue";
import type { PromptPart, PromptPartKind } from "@/features/plan/model/prompt";
import { offeredInterface } from "@/features/plan/model/tools";
import { DebugList } from "@/features/plan/ui/PromptAndPaste";
import type { Overrides } from "../model/history";
import PrettyText from "./PrettyText";

const KIND: Record<PromptPartKind, string> = {
  intro: "text-slate-300",
  student: "text-emerald-300",
  history: "text-emerald-300",
  rules: "text-amber-300",
  interface: "text-sky-300",
  links: "text-sky-300",
  format: "text-violet-300",
  example: "text-rose-300",
};

/** What the AI is offered, for the interface parts: the same lists as the plan's debug view. */
function Offered({ part, entries }: { part: PromptPart; entries: CatalogueEntry[] }) {
  const o = offeredInterface(entries);
  if (part.id === "tools") return <div className="flex flex-col gap-3"><DebugList title="Tools offered to the AI" items={o.tools} /><DebugList title="Play-along shapes" items={o.shapes} /></div>;
  if (part.id === "sections") return <DebugList title="Section types" items={o.sections} />;
  if (part.id === "links") return <ul className="font-mono text-slate-400">{o.links.map((l) => <li key={l} className="break-words">{l}</li>)}</ul>;
  return null;
}

function PartRow({ part, override, onOverride, entries }: {
  part: PromptPart; override?: Overrides[string]; onOverride: (o: Overrides[string] | undefined) => void; entries: CatalogueEntry[];
}) {
  const [editing, setEditing] = useState(false);
  const text = override?.text ?? part.text;
  const edited = override?.text !== undefined && override.text !== part.text;
  const off = !!override?.off;
  // examples are long indented JSON: give them most of the screen
  const tall = part.example ? "h-[75vh]" : "h-64";
  const change = (o: Overrides[string]) => onOverride(o.text === undefined && !o.off ? undefined : o);
  return (
    <li className={`rounded-lg border px-3 py-2 ${off ? "border-dashed border-slate-800 opacity-60" : edited ? "border-amber-500/50" : "border-slate-800"}`}>
      <details>
        <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
          <span className={`font-semibold ${off ? "line-through" : ""}`}>{part.label}</span>
          <Badge className={KIND[part.kind]}>{part.kind}</Badge>
          <span className="text-xs tabular-nums text-slate-500">{text.length.toLocaleString()} chars</span>
          {edited && <Badge className="text-amber-300">edited</Badge>}
          <span className="ml-auto flex gap-1.5" onClick={(e) => e.preventDefault()}>
            <Button size="sm" pressed={off} onClick={() => change({ ...override, off: !off })}>{off ? "Off" : "On"}</Button>
            <Button size="sm" pressed={editing} onClick={() => setEditing((v) => !v)}>Edit</Button>
            {edited && <Button size="sm" onClick={() => change({ off })}>Reset</Button>}
          </span>
        </summary>
        <div className="mt-2 flex flex-col gap-2 text-[11px]">
          {editing ? (
            <textarea aria-label={`${part.label} text`} value={text} onChange={(e) => change({ ...override, text: e.target.value })} spellCheck={false} className={`${tall} w-full rounded-lg border border-slate-700 bg-slate-950/60 p-2 font-mono text-slate-200 focus:border-sky-500 focus:outline-none`} />
          ) : (
            <pre className={`${part.example ? "max-h-[75vh]" : "max-h-80"} overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950/60 p-2 font-mono text-slate-300`}><PrettyText text={text} /></pre>
          )}
          <Offered part={part} entries={entries} />
        </div>
      </details>
    </li>
  );
}

/** Every part of the prompt as a row: label, kind, size; open for its text; switch it off or edit it in place. */
export default function PartList({ parts, overrides, onOverrides, entries }: {
  parts: PromptPart[]; overrides: Overrides; onOverrides: (o: Overrides) => void; entries: CatalogueEntry[];
}) {
  const set = (id: string, o: Overrides[string] | undefined) => {
    const next = { ...overrides };
    if (o) next[id] = o;
    else delete next[id];
    onOverrides(next);
  };
  return (
    <ol className="flex flex-col gap-1.5">
      {parts.map((p) => <PartRow key={p.id} part={p} override={overrides[p.id]} onOverride={(o) => set(p.id, o)} entries={entries} />)}
    </ol>
  );
}
