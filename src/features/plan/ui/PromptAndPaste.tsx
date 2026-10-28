"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui";
import type { CatalogueEntry } from "../model/catalogue";
import { parsePlanConfig } from "../model/config";
import type { PlanConfig } from "../model/types";

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

/** Step: paste the AI's reply; a valid plan goes to `onPlan`, anything else shows why. */
export function PasteConfig({ entries, onPlan }: { entries: CatalogueEntry[]; onPlan: (config: PlanConfig) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const build = () => {
    const r = parsePlanConfig(text, entries);
    if (!r.ok) {
      setError(r.error);
      setWarnings([]);
      return;
    }
    setError(null);
    setWarnings(r.warnings);
    setText("");
    onPlan(r.config);
  };
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your AI's reply here (the JSON block)"
        className="h-32 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-3 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={build} disabled={!text.trim()} className={primary}>
          <Icon name="sparkles" size={14} />
          Build my 7-day plan
        </Button>
        {error && <span role="alert" className="text-xs text-rose-300">{error}</span>}
      </div>
      {warnings.length > 0 && (
        <ul className="text-xs text-amber-300/90">
          {warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
    </div>
  );
}
