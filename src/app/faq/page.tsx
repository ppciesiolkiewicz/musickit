import type { Metadata } from "next";
import { shareMeta } from "@/app/_og/share";
import Link from "next/link";
import type { ReactNode } from "react";
import PageShell from "@/components/PageShell";
import { FAQ_TOUR } from "@/features/guide/tours/faq";
import { EARLY_OFFER, PRICING } from "@/features/account/pricing";
import { paymentsEnabled } from "@/features/account/server/paymentsEnabled";

/** Payments are on (`STRIPE_ENABLED`), read on the server when the page is built: the answers drop the beta. */
const PAYMENTS = paymentsEnabled();

const P = PRICING.player;
const PRICE_LINE = `${PAYMENTS ? "" : "Free while attunr is in beta. From launch, "}${P.monthPrice} a month or ${P.price} ${P.period} for your own practice: a new practice plan every day, as many as you like, and every tool and lesson. If your subscription ends you keep your plans, your notes and every tool, and only new practice plans need a subscription. Teachers pay by the number of students they give a plan each month. The first ${EARLY_OFFER.students} students and the first ${EARLY_OFFER.schools} schools get the early price: ${EARLY_OFFER.percentOff}% off any plan, monthly or yearly, locked in, so it doesn't go up while you stay subscribed.`;
const SAVED_LINE = "In your account. Your plans, progress and notes are saved to it, so they are there when you log in on another device or browser. The setup of a device stays in its browser: the colour style, the microphone and speakers you chose, and each tool's settings.";
const ACTIVE_LINE = `The students you gave a plan in the calendar month: you added them, made their next week or rotated their week. Students you didn't give a plan that month stay on your list and cost nothing, so you never have to remove anyone. Each plan also has a few extra students a month for free, for a busy month. The count starts again on the 1st.`;
const FREE_LINE = PAYMENTS
  ? "No, it is a subscription. A new subscription can start with a free trial, and if you cancel during the trial you pay nothing. A student whose teacher adds them pays nothing."
  : "Yes, while it is in beta.";
const TRY_LINE = "Yes. The guides have exercises you do right on the page, with no account: vocal warm-ups and pitch matching exercises. Start the mic and your voice is drawn over the note as you sing.";
const REFUND_LINE = `Yes. Email us within ${P.guaranteeDays} days of paying for a full refund, no reason needed. That is on top of your rights under Australian Consumer Law.`;

const DESCRIPTION = `Answers to common questions about attunr: ${PAYMENTS ? "" : "the beta, "}where your practice is saved, microphone setup, latency, the Practice plan, the price and the 30-day money-back guarantee.`;

export const metadata: Metadata = {
  title: "Frequently Asked Questions · attunr",
  description: DESCRIPTION,
  alternates: { canonical: "/faq" },
  ...shareMeta({ path: "/faq", title: "Frequently asked questions", description: DESCRIPTION }),
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
        text: `${FREE_LINE} You need an account: log in with your email or Google, and a new account is made the first time.`,
      },
    },
    {
      "@type": "Question",
      name: "Can I try attunr before I sign up?",
      acceptedAnswer: { "@type": "Answer", text: TRY_LINE },
    },
    {
      "@type": "Question",
      name: "Where is my practice saved?",
      acceptedAnswer: {
        "@type": "Answer",
        text: SAVED_LINE,
      },
    },
    {
      "@type": "Question",
      name: "Where do I start?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Open the Practice plan for a new set of exercises each day, start the course, or pick a tool from the menu at the top. Tune up first with the tuner.",
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
        text: "No. attunr puts your plan together from its library of exercises, for the steps you are on. Each day you open the Practice plan page, attunr makes that day's plan, and the stars you give each exercise shape the next one.",
      },
    },
    {
      "@type": "Question",
      name: "What does attunr cost?",
      acceptedAnswer: { "@type": "Answer", text: PRICE_LINE },
    },
    {
      "@type": "Question",
      name: "What is an active student?",
      acceptedAnswer: { "@type": "Answer", text: ACTIVE_LINE },
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
      { q: "Is attunr free?", a: <>{FREE_LINE} You need an account: <A href="/login">log in</A> with your email or Google, and a new account is made the first time.</> },
      { q: "Can I try attunr before I sign up?", a: <>Yes. The <A href="/learn">guides</A> have exercises you do right on the page, with no account: <A href="/learn/vocal-warm-ups">vocal warm-ups</A> and <A href="/learn/pitch-matching-exercises">pitch matching exercises</A>. Start the mic and your voice is drawn over the note as you sing.</> },
      { q: "Where is my practice saved?", a: <>{SAVED_LINE}</> },
      { q: "Where do I start?", a: <>Open the <A href="/plan">Practice plan</A>: it makes a new set of exercises each day. Every other tool and lesson is in <A href="/practice">Practice</A>. Tune up first with the <A href="/tuner">tuner</A>.</> },
      { q: "I teach guitar or voice. Can I use attunr?", a: <>Yes. A teacher gets the same app as a student, and a Students page: add a student, and attunr makes them a week of practice that you steer before each new week. Notes is made for lessons: lay out what you taught on one page and send it to the student as a link.</> },
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
    title: "The Practice plan",
    items: [
      { q: "Do I need my own AI?", a: <>No. attunr puts your plan together from its library of exercises, for the steps you are on. Each day you open the Practice plan page, attunr makes that day&apos;s plan, and the stars you give each exercise shape the next one.</> },
      { q: "What happens the next day?", a: <>When you open the Practice plan page on a new day, attunr makes a new plan. An exercise you rated 1 to 3 stars comes back; 4 or 5 stars move you on to the next step. For other exercises today, press <b className="text-slate-200">Get another plan</b>: the ones you rated stay. To change what you play or how long you practice, press <b className="text-slate-200">Change my answers</b>.</> },
    ],
  },
  {
    title: "Paying",
    items: [
      { q: "What does attunr cost?", a: <>{PRICE_LINE} The <A href="/terms">terms of use</A> have the details.</> },
      { q: "What is an active student?", a: <>{ACTIVE_LINE}</> },
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
