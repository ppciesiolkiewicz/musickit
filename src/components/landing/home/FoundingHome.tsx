import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import Icon from "@/components/Icon";
import ContactForm from "@/components/landing/ContactForm";
import AiPrep from "@/components/landing/AiPrep";
import FoundingBackdrop from "@/components/landing/FoundingBackdrop";
import SiteFooter from "@/components/landing/SiteFooter";
import { DISPLAY, Eyebrow, H2 } from "@/components/landing/Display";
import { SoonHeading, StudioSoonCards } from "@/components/landing/StudioSoon";
import { FOUNDING_PARTNERS_JOINED, FOUNDING_PARTNERS_NEEDED, FOUNDING_PRICE, FOUNDING_TRIAL_DAYS } from "@/lib/foundingOffer";

/*
 * The founding-partner page, at /kickstarter: the count of founding partners still needed, a founding partner's part in
 * the project, what a teacher does in every lesson (the AI practice plan and interactive lesson notes, `AiPrep`), the offer (a locked-in yearly price, with 90 days to change your mind and get all the money back)
 * and what the partners shape next (scheduling, online payments, profiles, courses to sell). Everything is centred and short. It is
 * written as the founder to one reader, in the voice of the outreach emails (`VOICE` in
 * src/features/devtools/model/kickstarter.ts): "I", plain, no hype, no deadline. The numbers come from
 * src/lib/foundingOffer.ts.
 */

const TRIAL = `${FOUNDING_TRIAL_DAYS} days`;
const TO_GO = Math.max(0, FOUNDING_PARTNERS_NEEDED - FOUNDING_PARTNERS_JOINED);

/** A founding partner's part in the project, in order. */
const PART: { title: string; text: string }[] = [
  { title: "You say what you need", text: "Tell me what takes your time in a lesson and in a week." },
  { title: "I build that first", text: "What founding partners ask for goes to the front of the list." },
  { title: "You try it and change it", text: "Use it with your students and tell me what to fix." },
];

/** The offer, one number each. */
const OFFER: { big: string; text: string; tone: string }[] = [
  { big: TRIAL, text: "to change your mind. Tell me in that time and you get 100% of your money back.", tone: "text-teal-300" },
  { big: FOUNDING_PRICE, text: "a year.", tone: "text-sky-300" },
  { big: "Locked in", text: "A founding partner's price doesn't go up later.", tone: "text-amber-300" },
];

const QUESTIONS: { q: string; a: string }[] = [
  { q: `Why ${FOUNDING_PARTNERS_NEEDED}?`, a: "That is how many I need to start: enough to pay for the work and to tell me what a studio needs." },
  { q: "Is it finished?", a: "No. attunr is a beta. It works and you can try it today, and I'm still improving it." },
  { q: "Who is behind it?", a: "I'm Pio. I build attunr, and it is an Australian company. When you write, you write to me." },
];

/** The hero's bottom padding fades to nothing, taking the backdrop with it. */
const HERO_FADE = "linear-gradient(to bottom, black calc(100% - 3.5rem), transparent)";

const CARD = "ls-card flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6";

/** The count: how many founding partners are still needed, and a seat for each one. */
function Countdown() {
  return (
    <div className="mt-10 flex flex-col items-center" role="group" aria-label={`${FOUNDING_PARTNERS_JOINED} of ${FOUNDING_PARTNERS_NEEDED} founding partners have joined`}>
      <div className="relative flex flex-col items-center gap-2" aria-hidden>
        <FoundingBackdrop />
        <span className="text-8xl leading-none text-slate-50 tabular-nums sm:text-9xl" style={DISPLAY}>{TO_GO}</span>
        <span className="text-sm uppercase tracking-[0.2em] text-sky-300">founding partners to go</span>
      </div>
      <ul className="mt-6 grid grid-cols-10 gap-2 sm:flex" aria-hidden>
        {Array.from({ length: FOUNDING_PARTNERS_NEEDED }, (_, i) => (
          <li key={i} className={`size-4 rounded-full border-2 ${i < FOUNDING_PARTNERS_JOINED ? "border-sky-300 bg-sky-300 shadow-[0_0_12px_var(--color-sky-400)]" : "border-slate-600 bg-slate-950/60"}`} />
        ))}
      </ul>
      <p className="mt-4 text-sm text-slate-400" aria-hidden>{FOUNDING_PARTNERS_JOINED} of {FOUNDING_PARTNERS_NEEDED} have joined. The project starts at {FOUNDING_PARTNERS_NEEDED}.</p>
    </div>
  );
}

export default function FoundingHome() {
  return (
    <div className="landing app-bg min-h-screen overflow-hidden text-slate-200">
      {/* no site nav: the page has one job, so the top holds only the wordmark, which goes home. The bar is clear glass, fixed over the page, and the hero's picture runs on behind it. */}
      <header className="fixed inset-x-0 top-0 z-40 flex justify-center border-b border-white/10 bg-white/[0.03] py-3 backdrop-blur-md sm:py-4">
        <Link href="/" aria-label="attunr home" className="rounded focus-visible:outline-2 focus-visible:outline-sky-400">
          <Wordmark className="text-[1.7rem]" />
        </Link>
      </header>

      {/* Hero: the count, over the ring of seats. It runs the full width of the page and starts under the glass bar. */}
      {/* the section clips the backdrop and fades it out through its bottom padding, so no seat lands on the next heading */}
      <section className="relative isolate flex flex-col items-center overflow-hidden px-4 pb-14 pt-28 text-center sm:px-6 sm:pb-20 sm:pt-36" style={{ maskImage: HERO_FADE, WebkitMaskImage: HERO_FADE }}>
          <div className="landing-rise flex flex-col items-center">
            <Eyebrow big>Founding partners</Eyebrow>
            <h1 className="max-w-3xl text-5xl leading-none tracking-tight text-slate-50 text-balance sm:text-7xl" style={DISPLAY}>
              Build attunr <span className="ls-accent italic text-sky-300">with me.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300 text-pretty">
              I&apos;m looking for {FOUNDING_PARTNERS_NEEDED} guitar and voice teachers and schools to use attunr early and decide what gets built.
            </p>
            <Countdown />
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <a href="#join" className="ls-btn ls-btn-primary ls-glint inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-300">
                Become a founding partner <Icon name="chevron-right" size={16} />
              </a>
            </div>
            {/* the guarantee sits right under the button, so nobody reads the price without it */}
            <p className="mt-6 inline-flex items-center gap-2.5 rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2.5 text-left text-sm text-emerald-100">
              <Icon name="check" size={18} className="shrink-0 text-emerald-300" />
              <span><b className="font-semibold text-emerald-50">100% money-back guarantee.</b> You have {TRIAL} to change your mind.</span>
            </p>
            <p className="mt-4 text-sm text-slate-400">{FOUNDING_PRICE} a year, locked in · An Australian company</p>
          </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* First after the hero: what attunr does in every lesson, with AI (the plan today, note drafting soon) */}
        <AiPrep />

        {/* A founding partner's part in the project */}
        <section id="your-part" aria-labelledby="your-part-h" className="scroll-mt-24 sect-rule py-12 text-center sm:py-16">
          <Eyebrow tone="text-amber-300">Your part in it</Eyebrow>
          <H2 id="your-part-h">You decide <span className="ls-accent italic text-amber-300">what gets built.</span></H2>
          <ol className="mt-10 grid gap-4 lg:grid-cols-3">
            {PART.map((p, i) => (
              <li key={p.title} className={`${CARD} items-center`}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-300">{i + 1}</span>
                <h3 className="text-2xl text-slate-50" style={DISPLAY}>{p.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{p.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* The offer */}
        <section id="offer" aria-labelledby="offer-h" className="scroll-mt-24 sect-rule py-12 text-center sm:py-16">
          <Eyebrow>The offer</Eyebrow>
          <H2 id="offer-h">{TRIAL} to decide. <span className="ls-accent italic text-sky-300">All your money back if it&apos;s a no.</span></H2>
          <ul className="mt-10 grid gap-4 lg:grid-cols-3">
            {OFFER.map((o) => (
              <li key={o.big} className={`${CARD} items-center`}>
                <span className={`text-5xl leading-none ${o.tone}`} style={DISPLAY}>{o.big}</span>
                <p className="max-w-xs text-sm leading-relaxed text-slate-400">{o.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* What the founding partners shape next */}
        <section id="coming-soon" aria-labelledby="coming-soon-h" className="scroll-mt-24 sect-rule py-12 sm:py-16">
          <div className="text-center">
            <Eyebrow>What we build next</Eyebrow>
            <H2 id="coming-soon-h">Tools to <span className="ls-accent italic text-sky-300">run your studio.</span></H2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-slate-300">Founding partners decide which comes first.</p>
          </div>
          <ul className="mt-10 grid gap-4 lg:grid-cols-2">
            <StudioSoonCards />
            <li className={CARD}>
              <SoonHeading icon="book-open" tone="bg-teal-500/15 text-teal-300" title="Courses you can sell" />
              <p className="text-sm leading-relaxed text-slate-400">Build a course from your lesson notes and your own videos, then sell it through attunr.</p>
              <div className="mt-auto flex flex-col gap-1.5 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-300" aria-hidden>
                {["Lesson 1 · The five notes", "Lesson 2 · Position 1", "Lesson 3 · Play it over a band"].map((l, i) => (
                  <span key={l} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5"><Icon name={i === 0 ? "play" : "file-text"} size={14} className="shrink-0 text-teal-300" /> {l}</span>
                ))}
              </div>
            </li>
          </ul>
        </section>

        {/* Questions */}
        <section id="questions" aria-labelledby="questions-h" className="scroll-mt-24 sect-rule py-12 text-center sm:py-16">
          <H2 id="questions-h">Questions</H2>
          <dl className="mx-auto mt-10 grid max-w-5xl gap-x-10 gap-y-8 lg:grid-cols-3">
            {QUESTIONS.map((x) => (
              <div key={x.q}>
                <dt className="font-semibold text-slate-100">{x.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-400">{x.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Join */}
        <section id="join" aria-labelledby="join-h" className="scroll-mt-24 sect-rule py-12 sm:py-16">
          <div className="ls-card mx-auto flex max-w-2xl flex-col gap-6 rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6 sm:p-8">
            <div className="text-center">
              <p id="join-h" className="text-3xl text-slate-50" style={DISPLAY}>Become a founding partner</p>
              <p className="mt-2 text-sm text-slate-400">Leave your email and a few words about what you teach. I&apos;ll write back.</p>
            </div>
            <ContactForm source="founding-partners" initialMessage={"Hi Pio, I'd like to become a founding partner. A bit about what I teach: "} cta="Send message" done="I'll reply by email." note="I only use your email to reply. No newsletter." />
          </div>
        </section>

        <SiteFooter />
      </div>
    </div>
  );
}
