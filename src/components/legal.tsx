import Link from "next/link";
import type { ReactNode } from "react";
import ContactForm from "@/components/landing/ContactForm";

/*
 * The parts the terms of use (/terms) and the privacy policy (/privacy) share: a link, the link to the contact form, and
 * the page body (a numbered list of what is on the page, one short section per subject, then the contact form). No email
 * address on these pages yet: every "reach us" goes to the form at the end of the page.
 */

const LINK = "text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-sky-200";

export const A = ({ href, children }: { href: string; children: ReactNode }) => <Link href={href} className={LINK}>{children}</Link>;

/** A link to another site. */
export const Out = ({ href, children }: { href: string; children: ReactNode }) => <a href={href} className={LINK}>{children}</a>;

/** "the contact form", a link to the form at the end of the page. */
export const Contact = () => <a href="#contact" className={LINK}>the contact form</a>;

export type LegalSection = { title: string; body: ReactNode };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, "-");

/** The sections of a legal page, under a list of them, then the contact form; `about` ends its heading ("Questions about these terms?"), `source` tags its messages. */
export function LegalSections({ sections, about, source }: { sections: LegalSection[]; about: string; source: string }) {
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
      <section id="contact" aria-labelledby="contact-h" className="flex scroll-mt-24 flex-col gap-3">
        <h2 id="contact-h" className="text-xl text-slate-50" style={{ fontFamily: "var(--font-display), serif" }}>Questions about {about}?</h2>
        <p className="text-sm leading-relaxed text-slate-300">Write to us here. We reply by email.</p>
        <ContactForm source={source} initialMessage="" done="We'll reply by email." />
      </section>
    </div>
  );
}
