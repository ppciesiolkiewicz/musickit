"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { FACTS, VOICE, outreachBrief, SAMPLE_EMAILS, type DemoLink } from "../model/kickstarter";

const BTN = "inline-flex min-h-8 cursor-pointer items-center rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-sky-400";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={BTN}
      disabled={!text}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function Block({ title, about, children }: { title: string; about: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-base font-semibold text-slate-100">{title}</h2>
      <p className="mb-3 text-xs text-slate-400">{about}</p>
      {children}
    </section>
  );
}

/** /dev/kickstarter: the brief an AI writes a founding-partner email from, and what goes into it: the voice, the facts, the samples, the demos. */
export default function KickstarterPage({ demos, allDemosUrl }: { demos: DemoLink[]; allDemosUrl: string }) {
  const brief = useMemo(() => outreachBrief(demos, allDemosUrl), [demos, allDemosUrl]);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Founding-partner emails</h2>
        <p className="text-sm text-slate-400">Copy the brief into an AI chat, with the email thread if there is one, and it writes the reply or a first email. Edit the voice and the facts in <code className="text-slate-300">src/features/devtools/model/kickstarter.ts</code>.</p>
      </div>
      <Block title="Brief for the AI" about="The facts, the voice, the sample emails and the demos, in one text.">
        <CopyButton text={brief} label="Copy brief" />
        <section aria-label="Brief for the AI" className="mt-2 max-h-[32rem] overflow-y-auto whitespace-pre-wrap wrap-break-word rounded-lg border border-slate-800 bg-slate-950/60 p-3 font-mono text-xs text-slate-300">{brief}</section>
      </Block>
      <div className="grid gap-4 lg:grid-cols-2">
        <Block title="Voice" about="How every email sounds.">
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-slate-200">{VOICE.map((v) => <li key={v}>{v}</li>)}</ul>
        </Block>
        <Block title="Facts" about="What an email may say about attunr and the offer. Nothing else.">
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-slate-200">{FACTS.map((f) => <li key={f}>{f}</li>)}</ul>
        </Block>
      </div>
      <Block title="Sample emails" about="Emails that went out and read the way these should. The brief gives them to the AI for tone and shape.">
        <div className="flex flex-col gap-3">
          {SAMPLE_EMAILS.map((e) => (
            <details key={e.label} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-100">{e.label}</summary>
              <p className="mt-1 text-xs text-slate-400">{e.about}</p>
              <p className="mt-2 whitespace-pre-wrap wrap-break-word font-mono text-xs text-slate-300">{e.text}</p>
              <div className="mt-2"><CopyButton text={e.text} label="Copy email" /></div>
            </details>
          ))}
        </div>
      </Block>
      <Block title="Demos" about="The demos an email can link to, with their public links.">
        <ul className="grid gap-2 sm:grid-cols-2">
          {demos.map((d) => (
            <li key={d.url} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <Link href={new URL(d.url).pathname} className="font-semibold text-slate-100 hover:underline">{d.label}</Link>
              <span className="mt-0.5 block text-xs text-slate-400">{d.about}</span>
              <span className="mt-1 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-mono text-xs text-slate-500">{d.url}</span>
                <CopyButton text={d.url} label="Copy link" />
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">All demos: <Link href="/demo" className="font-mono hover:underline">{allDemosUrl}</Link></p>
      </Block>
    </div>
  );
}
