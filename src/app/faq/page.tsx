import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = {
  title: "FAQ · attunr",
  description: "Answers to common questions about attunr: what is free, where your practice is saved, the microphone and headphones, browsers, the AI practice plan and the video course.",
};

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-sky-200">{children}</Link>
);

const slug = (s: string) => `faq-${s.toLowerCase().replace(/[^a-z]+/g, "-")}`;

type QA = { q: string; a: ReactNode };

const GROUPS: { title: string; items: QA[] }[] = [
  {
    title: "Getting started",
    items: [
      { q: "Is attunr free?", a: <>Yes. The tools, theory pages and exercises are free, and you don&apos;t need an account. Only the video course is paid.</> },
      { q: "Where is my practice saved?", a: <>In this browser, on this device. Your plan, settings and progress stay here between visits. If you clear your browser&apos;s site data, or open attunr on another device or browser, you start fresh.</> },
      { q: "Where do I start?", a: <>Make an <A href="/plan">AI practice plan</A> for a new set of exercises each day, start the <A href="/course">course</A>, or pick a tool from the menu at the top. Tune up first with the <A href="/tuner">tuner</A>.</> },
    ],
  },
  {
    title: "Microphone and sound",
    items: [
      { q: "Does attunr record or send my voice?", a: <>No. The tuner and the singing exercises listen in your browser to find the pitch. The sound is not sent anywhere.</> },
      { q: "Why should I use headphones?", a: <>The mic hears everything in the room. On speakers it also hears the drone, the click or the chords, and can take them for your voice or your guitar. With headphones it hears only you. No headphones? Turn the sound down and play or sing close to the mic.</> },
      { q: "The mic doesn't hear me", a: <>Check that the browser may use the microphone: click the icon beside the address bar and allow it. Then open the devices menu (the cog with headphones) on the page and choose the right input.</> },
      { q: "The sound comes late", a: <>Bluetooth headphones and speakers add a short delay. For timing drills, wired headphones or your computer&apos;s speakers keep the sound in time with you.</> },
      { q: "Which browser works best?", a: <>Any up-to-date browser works for practice. A few extras need Chrome or Edge: choosing the output device in the <A href="/looper">looper</A>, MIDI keyboards, and the teachers&apos; video studio.</> },
    ],
  },
  {
    title: "The AI practice plan",
    items: [
      { q: "Which AI do I need?", a: <>Any chat AI you already use, such as ChatGPT, Claude or Gemini. attunr writes the prompt, you paste it into your AI, then paste its reply back. attunr never talks to the AI itself.</> },
      { q: "What happens after the first week?", a: <>Choose <b className="text-slate-200">Plan next week</b>. The new prompt carries what you practised, so next week picks up where this one stopped.</> },
    ],
  },
  {
    title: "The video course",
    items: [
      { q: "When does the course open?", a: <>It is in early access now. Join from the <A href="/players#course">course section</A> to get the early-access price and every style course free as it launches. Prices may change before launch.</> },
      { q: "Can I get a refund?", a: <>Yes. Every bundle has a 30-day money-back guarantee: email us within 30 days of buying for a full refund, no reason needed.</> },
      { q: "I teach guitar. Can I use attunr?", a: <>Yes. See <A href="/teach">Teach on attunr</A>.</> },
    ],
  },
];

export default function FaqPage() {
  return (
    <PageShell active="/faq" title="Frequently asked questions" intro="Short answers about the app, the microphone, the practice plan and the course.">
      <div className="flex max-w-3xl flex-col gap-8">
        {GROUPS.map((g) => (
          <section key={g.title} aria-labelledby={slug(g.title)} className="flex flex-col gap-2">
            <h2 id={slug(g.title)} className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{g.title}</h2>
            <div className="flex flex-col divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
              {g.items.map((it) => (
                <details key={it.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-medium text-slate-100 hover:bg-slate-800/40 [&::-webkit-details-marker]:hidden">
                    <span className="flex-1">{it.q}</span>
                    <span aria-hidden className="text-lg leading-none text-slate-500 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="px-4 pb-4 text-sm leading-relaxed text-slate-300">{it.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
