"use client";

import { useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui";
import type { ParseResult } from "../model/config";
import { fixRequest } from "../model/fixRequest";
import type { OfferedItem } from "../model/tools";

const primary = "!border-sky-500/70 !bg-sky-500/20 !text-sky-100 hover:!bg-sky-500/30";

/** Each item as its short doc; open one for its full description and prop table. */
export function DebugList({ title, items }: { title: string; items: OfferedItem[] }) {
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

/** What the player says to the AI in their browser. */
const ASK_BROWSER_AI = "Write my practice plan from the prompt on this page and put it in the reply box.";
const BROWSER_AIS = "Claude in Chrome, Gemini in Chrome, ChatGPT Atlas, Comet…";

/** Copies `text`; shows a check for two seconds. False when the clipboard refuses. */
function useCopy(text: string): [boolean, () => Promise<boolean>] {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      return false;
    }
  };
  return [copied, copy];
}

/** One numbered step of the browser AI's how-to. */
function Step({ n, title, children }: { n: number; title: string; children?: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-500/25 text-xs font-semibold text-violet-100">{n}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
        <p className="text-sm text-slate-100">{title}</p>
        {children}
      </div>
    </li>
  );
}

/**
 * For an AI built into the browser (Claude in Chrome, Gemini in Chrome, ChatGPT Atlas, Comet…): four numbered steps, the
 * words to ask it (with a copy button), and the prompt as plain text on the page so it can read it. With WebMCP
 * (`agentTools`) it calls the page's tools instead.
 */
function BrowserAiHelp({ prompt, agentTools }: { prompt: string; agentTools: boolean }) {
  const [copied, copy] = useCopy(ASK_BROWSER_AI);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-violet-400/30 bg-slate-950/60 p-3">
      <ol className="flex flex-col gap-3">
        <Step n={1} title="Open your AI extension on this page.">
          <p className="text-xs text-slate-400">For example Claude in Chrome or Gemini in Chrome. AI browsers like ChatGPT Atlas or Comet work too.</p>
        </Step>
        <Step n={2} title="Copy the prompt below and paste it into the AI extension:">
          <div className="flex items-start gap-2 rounded-lg bg-slate-900 px-2.5 py-2">
            <p className="flex-1 text-sm text-slate-100">&ldquo;{ASK_BROWSER_AI}&rdquo;</p>
            <button
              type="button"
              onClick={() => void copy()}
              aria-label={copied ? "Copied" : "Copy this prompt"}
              className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md border border-slate-700 text-slate-300 hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              <Icon name={copied ? "check" : "copy"} size={13} />
            </button>
          </div>
        </Step>
        <Step n={3} title={agentTools ? "The AI extension reads this page and sends your plan straight to the reply box." : "The AI extension reads this page and pastes your plan into the reply box."} />
        <Step n={4} title="Check the plan, then press Build my plan." />
      </ol>
      <section aria-label="Prompt for the AI" className="border-t border-slate-800 pt-2">
        <h4 className="mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">What the AI extension reads</h4>
        <div className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[11px] text-slate-400">{prompt}</div>
      </section>
    </div>
  );
}

/** Step: copy the prompt for the player's own AI, or let the AI in their browser read it (the highlighted card). */
export function CopyPrompt({ prompt, label = "Copy prompt", agentTools = false }: { prompt: string; label?: string; agentTools?: boolean }) {
  const [copied, copyPrompt] = useCopy(prompt);
  const [show, setShow] = useState(false);
  const [browserAi, setBrowserAi] = useState(agentTools);
  const copy = async () => {
    if (!(await copyPrompt())) setShow(true);
  };
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={browserAi}
        onClick={() => setBrowserAi((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-violet-400/50 bg-gradient-to-r from-violet-500/20 to-sky-500/10 p-3 text-left hover:border-violet-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"
      >
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-500/25 text-violet-100">
          <Icon name="sparkles" size={16} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-slate-50">
            Let your AI extension do it
            <span className="rounded-full bg-violet-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-100">No copy and paste</span>
          </span>
          <span className="text-xs text-slate-400">{BROWSER_AIS}</span>
        </span>
        <Icon name="chevron-down" size={16} className={`shrink-0 text-violet-200 transition-transform ${browserAi ? "rotate-180" : ""}`} />
      </button>
      {browserAi && <BrowserAiHelp prompt={prompt} agentTools={agentTools} />}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">Or use any AI chat:</span>
        <Button onClick={copy} className={primary}>
          <Icon name={copied ? "check" : "copy"} size={14} />
          {copied ? "Copied" : label}
        </Button>
        <Button size="sm" onClick={() => setShow((v) => !v)}>{show ? "Hide" : "Show"} prompt</Button>
      </div>
      {show && <textarea readOnly value={prompt} onFocus={(e) => e.currentTarget.select()} className="h-48 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-3 font-mono text-[11px] text-slate-300" />}
    </div>
  );
}

/** Copies a request that asks the player's AI to fix what the app changed or dropped in its plan; if the clipboard refuses, the message is shown to copy by hand. */
function CopyFixRequest({ warnings }: { warnings: string[] }) {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);
  const message = fixRequest(warnings);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShow(true);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={copy} className={primary}>
          <Icon name={copied ? "check" : "copy"} size={14} />
          {copied ? "Copied" : "Copy fix request"}
        </Button>
        <span className="text-xs text-slate-500">Paste it to your AI to get a corrected plan.</span>
      </div>
      {show && <textarea readOnly value={message} onFocus={(e) => e.currentTarget.select()} className="h-32 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-3 font-mono text-[11px] text-slate-300" />}
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
        aria-label="Your AI's reply: the JSON plan"
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
        <>
          <ul className="text-xs text-amber-300/90">
            {result.warnings.map((w, i) => <li key={`${i}-${w}`}>{w}</li>)}
          </ul>
          <CopyFixRequest warnings={result.warnings} />
        </>
      )}
    </div>
  );
}
