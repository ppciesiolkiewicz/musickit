"use client";

import Link from "next/link";
import { useMemo } from "react";
import { LINK_GROUPS, type DemoLink } from "../model/kickstarter";
import { PILLARS, STUDENT_NEVER, STUDENT_OFFER_LINE, STUDENT_TERMS, studentOffer } from "../model/kickstarterStudents";
import { Block, CopyButton } from "./KickstarterPage";

const LIST = "flex list-disc flex-col gap-1.5 pl-5 text-sm text-slate-200";

/** /admin/dev/kickstarter: the offer to students, the three things it stands on, its terms, what is never said, and the pages that show it. */
export default function StudentOfferPage({ demos }: { demos: DemoLink[] }) {
  const offer = useMemo(() => studentOffer(demos), [demos]);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">The offer to students</h2>
        <p className="text-sm text-slate-400">What a person who practises on their own gets from attunr, and on what terms. Anything written for students is written from this page. Edit it in <code className="text-slate-300">src/features/devtools/model/kickstarterStudents.ts</code>.</p>
      </div>
      <section aria-label="The offer in one line" className="rounded-xl border border-sky-900 bg-sky-950/30 p-4">
        <p className="text-base font-medium text-slate-100">{STUDENT_OFFER_LINE}</p>
        <div className="mt-3"><CopyButton text={offer} label="Copy offer" /></div>
      </section>
      <div className="grid gap-4 lg:grid-cols-3">
        {PILLARS.map((p, i) => (
          <Block key={p.title} title={`${i + 1}. ${p.title}`} about={p.promise}>
            <ul className={LIST}>{p.facts.map((f) => <li key={f}>{f}</li>)}</ul>
          </Block>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Block title="The terms" about="What a student gets and pays, and what signing up means today. The numbers are in src/lib/studentOffer.ts.">
          <ul className={LIST}>{STUDENT_TERMS.map((t) => <li key={t}>{t}</li>)}</ul>
        </Block>
        <Block title="Never say" about="What nothing written for a student says, and why.">
          <ul className={LIST}>{STUDENT_NEVER.map((n) => <li key={n}>{n}</li>)}</ul>
        </Block>
      </div>
      <Block title="Pages to show, strongest first" about="What shows a student the offer, by group. Each can be tried without signing up.">
        <div className="flex flex-col gap-4">
          {LINK_GROUPS.map((g) => {
            const ds = demos.filter((d) => d.group === g);
            return ds.length ? (
              <div key={g}>
                <h3 className="mb-2 text-sm font-semibold text-slate-200">{g}</h3>
                <ol className="grid gap-2 lg:grid-cols-2">
                  {ds.map((d, i) => (
                    <li key={d.url} className="flex gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                      <span className="w-5 shrink-0 text-right font-mono text-xs text-slate-500">{i + 1}.</span>
                      <span className="min-w-0 flex-1">
                        <Link href={new URL(d.url).pathname} className="font-semibold text-slate-100 hover:underline">{d.label}</Link>
                        <span className="mt-0.5 block text-xs text-slate-400">{d.about}</span>
                        <span className="mt-1 flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate font-mono text-xs text-slate-500">{d.url}</span>
                          <CopyButton text={d.url} label="Copy link" />
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null;
          })}
        </div>
      </Block>
      <Block title="The full offer as text" about="Everything above in one text, to paste where something for students is written.">
        <section aria-label="The full offer as text" className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap wrap-break-word rounded-lg border border-slate-800 bg-slate-950/60 p-3 font-mono text-xs text-slate-300">{offer}</section>
      </Block>
    </div>
  );
}
