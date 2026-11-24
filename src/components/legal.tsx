import Link from "next/link";
import type { ReactNode } from "react";

/*
 * The parts the terms of use (/terms) and the privacy policy (/privacy) share: a link, the contact address, and the page
 * body (a numbered list of what is on the page, then one short section per subject).
 */

export const LEGAL_EMAIL = "hello@attunr.app";

const LINK = "text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-sky-200";

export const A = ({ href, children }: { href: string; children: ReactNode }) => <Link href={href} className={LINK}>{children}</Link>;

/** A link to another site. */
export const Out = ({ href, children }: { href: string; children: ReactNode }) => <a href={href} className={LINK}>{children}</a>;

export const Mail = () => <a href={`mailto:${LEGAL_EMAIL}`} className={LINK}>{LEGAL_EMAIL}</a>;

export type LegalSection = { title: string; body: ReactNode };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, "-");

/** The sections of a legal page, under a list of them; `about` ends the last line ("Questions about these terms"). */
export function LegalSections({ sections, about }: { sections: LegalSection[]; about: string }) {
  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <nav aria-label="On this page" className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
        <ol className="grid gap-1.5 sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.title}><a href={`#${slug(s.title)}`} className="text-slate-300 hover:text-slate-50"><span className="mr-2 tabular-nums text-slate-500">{i + 1}.</span>{s.title}</a></li>
          ))}
        </ol>
      </nav>
      {sections.map((s, i) => (
        <section key={s.title} id={slug(s.title)} aria-labelledby={`${slug(s.title)}-h`} className="scroll-mt-24">
          <h2 id={`${slug(s.title)}-h`} className="text-xl text-slate-50" style={{ fontFamily: "var(--font-display), serif" }}>
            <span className="mr-2 tabular-nums text-slate-500">{i + 1}.</span>{s.title}
          </h2>
          <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-slate-300">{s.body}</div>
        </section>
      ))}
      <p className="text-xs text-slate-500">Questions about {about}: <Mail />.</p>
    </div>
  );
}
