"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui";
import type { ParseResult } from "../model/config";
import type { CatalogueEntry } from "../model/catalogue";
import { offeredInterface, type OfferedItem } from "../model/tools";

const primary = "!border-sky-500/70 !bg-sky-500/20 !text-sky-100 hover:!bg-sky-500/30";

/** Each item as its short doc; open one for its full description and prop table. */
function DebugList({ title, items }: { title: string; items: OfferedItem[] }) {
  return (
    <div>
      <h4 className="font-semibold text-slate-400">{title} ({items.length})</h4>
      <ul className="mt-1 flex flex-col gap-1">
        {items.map((it) => (
          <li key={it.name}>
            <details>
              <summary className="cursor-pointer font-mono text-sky-300">{it.short}</summary>
              <p className="mt-1 text-slate-400">{it.description}</p>
              <table className="mt-1 w-full border-collapse font-mono">
                <tbody>
                  {it.params.map((p) => (
                    <tr key={p.name} className="border-t border-slate-800 align-top">
                      <td className="py-0.5 pr-2 text-slate-200">{p.name}{p.required && <span className="text-rose-300">*</span>}</td>
                      <td className="py-0.5 pr-2 text-amber-300/90">{p.type}</td>
                      <td className="py-0.5 font-sans text-slate-500">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Step: copy the prompt for the player's own AI. */
export function CopyPrompt({ prompt, entries, label = "Copy prompt" }: { prompt: string; entries: CatalogueEntry[]; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);
  const [debug, setDebug] = useState(false);
  const offered = offeredInterface(entries);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShow(true);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={copy} className={primary}>
          <Icon name={copied ? "check" : "copy"} size={14} />
          {copied ? "Copied" : label}
        </Button>
        <Button size="sm" onClick={() => setShow((v) => !v)}>{show ? "Hide" : "Show"} prompt</Button>
        <Button size="sm" onClick={() => setDebug((v) => !v)}>{debug ? "Hide" : "Show"} debug</Button>
        <span className="text-xs text-slate-500">Paste it into ChatGPT, Claude, Gemini… and copy its reply.</span>
      </div>
      {debug && (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-[11px] text-slate-300">
          <DebugList title="Tools offered to the AI" items={offered.tools} />
          <DebugList title="Play-along shapes" items={offered.shapes} />
          <DebugList title="Section types" items={offered.sections} />
          <div>
            <h4 className="font-semibold text-slate-400">Link resources ({offered.links.length})</h4>
            <ul className="font-mono text-slate-400">{offered.links.map((l) => <li key={l} className="break-words">{l}</li>)}</ul>
          </div>
          <p className="text-slate-500">Prompt size: {prompt.length} chars</p>
        </div>
      )}
      {show && <textarea readOnly value={prompt} onFocus={(e) => e.currentTarget.select()} className="h-48 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-3 font-mono text-[11px] text-slate-300" />}
    </div>
  );
}

/** Step: paste the AI's reply. The parent parses it (to enable Build); this shows the box and why it isn't a plan yet. */
export function PasteBox({ text, onText, result }: { text: string; onText: (t: string) => void; result: ParseResult | null }) {
  return (
    <div className="flex flex-col gap-2">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => onText(e.target.value)}
        placeholder="Paste your AI's reply here (the JSON block)"
        className="h-40 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-3 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
      />
      {result && !result.ok && <p role="alert" className="text-xs text-rose-300">{result.error}</p>}
      {result?.ok && (
        <p className="text-xs text-emerald-300">
          <Icon name="check" size={12} className="mr-1 inline" />
          {result.config.title}: {result.config.days.length} days ready
        </p>
      )}
      {result?.ok && result.warnings.length > 0 && (
        <ul className="text-xs text-amber-300/90">
          {result.warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
    </div>
  );
}
