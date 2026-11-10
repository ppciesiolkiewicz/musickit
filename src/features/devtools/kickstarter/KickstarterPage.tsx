"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { registerAgentTools } from "@/lib/webmcp";
import { DEFAULT_INPUTS, FACTS, KICKSTARTER_KEY, VOICE, isReply, outreachBrief, readInputs, SAMPLE_EMAILS, type DemoLink, type OutreachInputs } from "../model/kickstarter";
import { useMounted } from "../prompt/storage";

/** What to say to the AI extension. */
const ASK_EXTENSION = "Use the brief on this page to draft the email, and put it in the Reply box. Don't send anything.";

const BTN = "inline-flex min-h-8 cursor-pointer items-center rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-sky-400";
const FIELD = "w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:outline-2 focus-visible:outline-sky-400";
const LABEL = "mb-1 block text-xs font-medium text-slate-400";

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

function load(): OutreachInputs {
  try {
    return readInputs(JSON.parse(localStorage.getItem(KICKSTARTER_KEY) ?? "null"));
  } catch {
    return DEFAULT_INPUTS;
  }
}

function Tool({ demos, allDemosUrl }: { demos: DemoLink[]; allDemosUrl: string }) {
  const [inputs, setInputs] = useState(load);
  const [draft, setDraft] = useState("");
  const brief = useMemo(() => outreachBrief(inputs, demos, allDemosUrl), [inputs, demos, allDemosUrl]);
  const reply = isReply(inputs);

  useEffect(() => {
    try {
      localStorage.setItem(KICKSTARTER_KEY, JSON.stringify(inputs));
    } catch {
      /* storage full or blocked: the page still works */
    }
  }, [inputs]);

  // WebMCP: a browser AI that has it reads the brief and sends the draft without touching the page.
  const briefRef = useRef(brief);
  useEffect(() => {
    briefRef.current = brief;
  });
  useEffect(
    () =>
      registerAgentTools([
        {
          name: "get_founding_partner_email_brief",
          description: "The brief for one attunr founding-partner email: the pasted email thread, the facts, the voice and the demo links. Read it, write the email, then send it with submit_founding_partner_email.",
          inputSchema: { type: "object", properties: {} },
          annotations: { readOnlyHint: true },
          execute: () => briefRef.current,
        },
        {
          name: "submit_founding_partner_email",
          description: "Put the email you wrote in the page's Reply box, as plain text. Nothing is sent.",
          inputSchema: { type: "object", properties: { email: { type: "string", description: "The email, plain text." } }, required: ["email"] },
          execute: (input) => {
            const email = typeof input.email === "string" ? input.email.trim() : "";
            if (!email) return "No email received. Send it as the `email` text.";
            setDraft(email);
            return "The email is in the Reply box. Nothing was sent.";
          },
        },
      ]),
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <Block title="1. Paste the email thread" about="Copy the whole conversation from your mail app and paste it here. Leave it empty to write a first email. Kept in this browser.">
        <textarea aria-label="Email thread" className={`${FIELD} font-mono`} rows={10} value={inputs.thread} placeholder="Paste the emails here, newest first or last." onChange={(e) => setInputs((s) => ({ ...s, thread: e.target.value }))} />
        <label className="mt-3 block">
          <span className={LABEL}>Anything the thread doesn&apos;t say (optional)</span>
          <input className={FIELD} value={inputs.note} placeholder="Offer a call on Thursday" onChange={(e) => setInputs((s) => ({ ...s, note: e.target.value }))} />
        </label>
        {(inputs.thread || inputs.note) && <button type="button" className={`${BTN} mt-3`} onClick={() => { setInputs(DEFAULT_INPUTS); setDraft(""); }}>Clear</button>}
      </Block>

      <Block title="2. Ask the AI extension" about="Open Claude in Chrome on this page and paste this in. It reads the brief at the bottom of the page and writes into the Reply box.">
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-950/60 px-3 py-2">
          <p className="min-w-0 flex-1 text-sm text-slate-100">&ldquo;{ASK_EXTENSION}&rdquo;</p>
          <CopyButton text={ASK_EXTENSION} label="Copy" />
        </div>
        <p className="mt-2 text-xs text-slate-500">Using an AI chat instead? Press Copy brief, paste it into the chat, and paste the answer into the Reply box.</p>
      </Block>

      <Block title={reply ? "3. Reply" : "3. First email"} about="The AI extension writes here. Read it, change what you like, fill in any [ANSWER: …], then copy it into your mail app. Nothing is sent from this page.">
        <textarea id="email-reply" aria-label="Reply" className={`${FIELD} font-mono`} rows={12} value={draft} placeholder={reply ? "The reply shows here." : "Subject: …\n\nThe email shows here."} onChange={(e) => setDraft(e.target.value)} />
        <div className="mt-2 flex flex-wrap gap-2">
          <CopyButton text={draft} label={reply ? "Copy reply" : "Copy email"} />
          {draft && <button type="button" className={BTN} onClick={() => setDraft("")}>Clear</button>}
        </div>
      </Block>

      <Block title="Brief for the AI" about="What the AI extension reads: the thread, the facts, the voice and the demos. It follows what you paste above.">
        <CopyButton text={brief} label="Copy brief" />
        <section aria-label="Brief for the AI" className="mt-2 max-h-[32rem] overflow-y-auto whitespace-pre-wrap wrap-break-word rounded-lg border border-slate-800 bg-slate-950/60 p-3 font-mono text-xs text-slate-300">{brief}</section>
      </Block>
    </div>
  );
}

/** /dev/kickstarter: paste an email thread, and an AI extension drafts the reply from the brief: the thread, the voice, the facts. */
export default function KickstarterPage({ demos, allDemosUrl }: { demos: DemoLink[]; allDemosUrl: string }) {
  const mounted = useMounted();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Founding-partner emails</h2>
        <p className="text-sm text-slate-400">Paste a conversation with a music school, and your AI extension drafts the reply in the voice below. Edit the voice and the facts in <code className="text-slate-300">src/features/devtools/model/kickstarter.ts</code>.</p>
      </div>
      {mounted && <Tool demos={demos} allDemosUrl={allDemosUrl} />}
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
      <Block title="Demos" about="The demos listed on /demo, with the public links an email carries.">
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
