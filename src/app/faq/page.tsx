import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import PageShell from "@/components/PageShell";
import { FAQ_TOUR } from "@/features/guide/tours/faq";
import { PRICING } from "@/features/account/pricing";

const P = PRICING.player;
const PRICE_LINE = `Free while attunr is in beta. From launch, ${P.price} ${P.period}: ${P.plansPerMonth} AI autoplans a month (or up to ${P.notesPerMonth} AI-written notes instead), and every other tool and lesson as much as you like. After the year you keep your plans and every tool, and top up only for new autoplans. Music schools are priced by agreement.`;
const REFUND_LINE = `Yes. Email us within ${P.guaranteeDays} days of paying for a full refund, no reason needed. That is on top of your rights under Australian Consumer Law.`;

export const metadata: Metadata = {
  title: "Frequently Asked Questions · attunr",
  description: "Answers to common questions about attunr: the beta, browser storage, microphone setup, latency, the AI practice plan, the price and the 30-day money-back guarantee.",
  alternates: { canonical: "/faq" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is attunr free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, while it is in beta. You need an account: log in with your email or Google, and a new account is made the first time.",
      },
    },
    {
      "@type": "Question",
      name: "Where is my practice saved?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "In this browser, on this device. Your plan, settings and progress stay here between visits. If you clear your browser's site data, or open attunr on another device or browser, you start fresh.",
      },
    },
    {
      "@type": "Question",
      name: "Where do I start?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Make an AI practice plan for a new set of exercises each day, start the course, or pick a tool from the menu at the top. Tune up first with the tuner.",
      },
    },
    {
      "@type": "Question",
      name: "Does attunr record or send my voice?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. The tuner and the singing exercises listen in your browser to find the pitch. The sound is not sent anywhere.",
      },
    },
    {
      "@type": "Question",
      name: "Why should I use headphones?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The mic hears everything in the room. On speakers it also hears the drone, the click or the chords, and can take them for your voice or your guitar. With headphones it hears only you.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need my own AI?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. attunr puts your plan together from its library of exercises, for the steps you are on. In the beta, attunr can't make new plans yet: it saves your answers for your first plan, and the demo plans show what a week looks like.",
      },
    },
    {
      "@type": "Question",
      name: "What does attunr cost?",
      acceptedAnswer: { "@type": "Answer", text: PRICE_LINE },
    },
    {
      "@type": "Question",
      name: "Can I get a refund?",
      acceptedAnswer: { "@type": "Answer", text: REFUND_LINE },
    },
  ],
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
      { q: "Is attunr free?", a: <>Yes, while it is in beta. You need an account: <A href="/login">log in</A> with your email or Google, and a new account is made the first time.</> },
      { q: "Where is my practice saved?", a: <>In this browser, on this device. Your plan, settings and progress stay here between visits. If you clear your browser&apos;s site data, or open attunr on another device or browser, you start fresh.</> },
      { q: "Where do I start?", a: <>Make an <A href="/plan">AI practice plan</A>: it opens a new set of exercises each day. Every other tool and lesson is in <A href="/practice">Practice</A>. Tune up first with the <A href="/tuner">tuner</A>.</> },
      { q: "I teach guitar or voice. Can I use attunr?", a: <>Yes. A teacher gets the same app as a student: the plan, Notes and Practice. Notes is made for lessons: lay out what you taught on one page and send it to the student as a link.</> },
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
      { q: "Do I need my own AI?", a: <>No. attunr puts your plan together from its library of exercises, for the steps you are on. In the beta, attunr can&apos;t make new plans yet: it saves your answers for your first plan, and the demo plans show what a week looks like.</> },
      { q: "What happens after the first week?", a: <>Choose <b className="text-slate-200">Plan next week</b> and say how the week went. attunr saves your notes with the plan, so the next plan picks up where this one stopped.</> },
    ],
  },
  {
    title: "Paying",
    items: [
      { q: "What does attunr cost?", a: <>{PRICE_LINE} The <A href="/terms">terms of use</A> have the details.</> },
      { q: "Can I get a refund?", a: <>{REFUND_LINE}</> },
      { q: "What if attunr shuts down?", a: <>You get at least 60 days&apos; notice by email, time to download your plans and notes, and the months left on a paid subscription back.</> },
    ],
  },
];

export default function FaqPage() {
  return (
    <PageShell active="/faq" pageId="faq" tour={FAQ_TOUR} title="Frequently asked questions" intro="Short answers about the app, the microphone, the practice plan and paying.">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="flex max-w-3xl flex-col gap-8">
        {GROUPS.map((g, gi) => (
          <section key={g.title} data-tour={gi === 0 ? "faq-group" : undefined} aria-labelledby={slug(g.title)} className="flex flex-col gap-2">
            <h2 id={slug(g.title)} className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{g.title}</h2>
            <div className="flex flex-col divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
              {g.items.map((it, i) => (
                <details key={it.q} data-tour={gi === 0 && i === 0 ? "faq-question" : undefined} className="group">
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
