"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui";
import type { ParseResult } from "../model/config";

const primary = "!border-sky-500/70 !bg-sky-500/20 !text-sky-100 hover:!bg-sky-500/30";

/** Step: copy the prompt for the player's own AI. */
export function CopyPrompt({ prompt, label = "Copy prompt" }: { prompt: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);
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
        <span className="text-xs text-slate-500">Paste it into ChatGPT, Claude, Gemini… and copy its reply.</span>
      </div>
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
