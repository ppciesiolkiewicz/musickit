import type { Metadata } from "next";
import Link from "next/link";
import { shareMeta } from "@/app/_og/share";
import SiteNav from "@/components/SiteNav";
import Icon, { type IconName } from "@/components/Icon";
import Glow from "@/components/landing/Glow";
import SiteFooter from "@/components/landing/SiteFooter";
import { DISPLAY, Eyebrow, H2, Mark } from "@/components/landing/Display";
import { Check } from "@/components/landing/home/PracticeSections";
import { loginHref } from "@/lib/publicPaths";
import LooperStageMock from "./LooperStageMock";

/*
 * The looper's product page: what the looper at /looper does, for someone who searched for a looper. The looper is an
 * open tool (OPEN_TOOLS in src/lib/publicPaths.ts), so Open the looper needs no account; the last section offers the
 * attunr account for the rest of the app. Every claim here is in spec/looper.md (or spec/nam.md):
 * say nothing the looper doesn't do.
 */

const TITLE = "Online Looper: Record and Stack Loops in Your Browser · attunr";
const DESCRIPTION = "A multi-track looper in the browser. Plug in a guitar through an audio interface or sing into a mic, record loops in time with the metronome, add effects, amp models, drums and bass. Nothing to install.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/online-looper" },
  ...shareMeta({ path: "/online-looper", title: "attunr Looper: record and stack loops in your browser", description: DESCRIPTION }),
};

const LOOPER = "/looper";

type Card = { icon: IconName; title: string; text: string };

const STEPS: Card[] = [
  { icon: "plug", title: "Connect your sound", text: "An audio interface, a USB mic or your computer's own mic. The looper finds your interface and sets up a guitar input and a vocal input on it." },
  { icon: "circle-dot", title: "Record the first loop", text: "Press Record on a loop. The metronome counts in for a bar and the take starts on beat 1. Press Stop the take, and the take ends on the beat, so the loop comes round in time." },
  { icon: "layers", title: "Stack the next ones", text: "Each new take starts when the loop comes round. It can be 1, 2, 4, 8 or 16 times as long as the first loop." },
];

const FEATURES: Card[] = [
  { icon: "layers", title: "Loops in groups", text: "Loops sit in coloured groups on a stage. Each group has its own bus with effects and a volume, and starts and stops on the beat." },
  { icon: "guitar", title: "Effects and amp models", text: "Tape delay, reverb, distortion, chorus, phaser, tremolo, compressor, EQ, a filter and noise removal, on any input or bus. Load your own Neural Amp Modeler (.nam) files for the amp." },
  { icon: "drum", title: "Drums, bass and a drone", text: "Step sequencers for drums and bass, and a drone, all in time with the metronome. Their sounds are made in the browser." },
  { icon: "piano", title: "Instruments to play", text: "A piano, a scale piano and a soundboard of pads. Play them from the computer keyboard or a MIDI keyboard, and record them like any other input." },
  { icon: "audio-lines", title: "Every channel of your interface", text: "Record one input of your interface, a pair in stereo, or a pair mixed to mono. A meter for each channel shows where the sound comes in." },
  { icon: "history", title: "Undo and macros", text: "Every change goes into the history, so you can undo it. Record a few changes as a macro and run them again with one press." },
];

const BEFORE: string[] = [
  "Use headphones, or the direct monitoring on your interface: sound played back through the browser comes a little late.",
  "The latency setting moves new takes earlier, so they line up with the beat.",
  "Chrome reads at most two channels from one device.",
  "Recorded loops stay in this browser tab and are never uploaded. Your inputs, groups and effects are kept for next time.",
];

const PRIMARY = "ls-btn ls-btn-primary ls-glint inline-flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-500/20 transition hover:bg-teal-300";
const SECONDARY = "ls-btn inline-flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-800/40";

const ACCOUNT_LINE = "No account needed.";

export default function OnlineLooperPage() {
  return (
    <div className="landing app-bg isolate min-h-screen overflow-clip text-slate-200">
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-b border-slate-800/70 py-2.5 sm:py-4">
          <SiteNav active="/online-looper" />
        </div>

        {/* Hero */}
        <section className="relative isolate grid grid-cols-[minmax(0,1fr)] items-center gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:py-20">
          <Glow spots={[
            { tone: "teal", at: { right: "-6rem", top: "-8rem" }, size: "46rem", strength: 0.24 },
            { tone: "violet", at: { left: "-14rem", top: "-4rem" }, size: "34rem", strength: 0.16 },
            { tone: "sky", at: { right: "8rem", bottom: "-12rem" }, size: "26rem", strength: 0.14 },
          ]} />
          <div className="landing-rise flex flex-col items-start">
            <Eyebrow big tone="text-teal-300">Looper</Eyebrow>
            <h1 className="text-5xl leading-none tracking-tight text-slate-50 sm:text-7xl" style={DISPLAY}>
              A looper <span className="ls-accent block italic text-teal-300">in your browser.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-300">
              Plug your guitar into an audio interface or sing into a mic, and <Mark tone="var(--color-teal-400)">record loops in time with the metronome</Mark>. Stack them in groups, give each group its effects, and start drums and bass under them. Nothing to install.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={LOOPER} className={PRIMARY}>Open the looper <Icon name="chevron-right" size={16} /></Link>
              <a href="#how" className={SECONDARY}><Icon name="play" size={16} /> How it works</a>
            </div>
            <p className="mt-5 max-w-md text-sm text-slate-400">{ACCOUNT_LINE}</p>
          </div>
          <div className="landing-rise relative" style={{ animationDelay: "120ms" }}>
            <LooperStageMock />
          </div>
        </section>

        {/* How a loop is made */}
        <section id="how" aria-labelledby="how-h" className="scroll-mt-6 sect-rule py-12 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow tone="text-teal-300">How it works</Eyebrow>
            <H2 id="how-h">One take sets <span className="ls-accent italic text-teal-300">the loop.</span></H2>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="ls-card metal-panel rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-500/15 text-teal-300"><Icon name={s.icon} size={18} /></span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-50">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* What it has */}
        <section id="features" aria-labelledby="features-h" className="scroll-mt-6 sect-rule py-12 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow tone="text-violet-300">What it has</Eyebrow>
            <H2 id="features-h">A small studio <span className="ls-accent italic text-violet-300">on one page.</span></H2>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="ls-card metal-panel rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/15 text-violet-300"><Icon name={f.icon} size={18} /></span>
                <h3 className="mt-4 text-lg font-semibold text-slate-50">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Before you start */}
        <section id="before" aria-labelledby="before-h" className="scroll-mt-6 sect-rule py-12 sm:py-16">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <Eyebrow tone="text-amber-300">Before you start</Eyebrow>
              <H2 id="before-h">Good to know <span className="ls-accent italic text-amber-300">first.</span></H2>
              <p className="mt-4 max-w-lg text-slate-300">The looper asks for the microphone only when you add an input or press Detect devices. Echo cancellation and noise suppression stay off, so your instrument is recorded as it sounds.</p>
            </div>
            <ul className="flex flex-col gap-3 text-sm text-slate-300">
              {BEFORE.map((b) => <Check key={b} tone="text-amber-300">{b}</Check>)}
            </ul>
          </div>
        </section>

        {/* One account */}
        <section aria-labelledby="account-h" className="sect-rule py-12 sm:py-16">
          <div className="ls-card metal-panel relative overflow-hidden rounded-3xl border border-teal-500/30 bg-slate-900/60 p-6 sm:p-10">
            <H2 id="account-h">More practice tools <span className="ls-accent italic text-teal-300">and a daily practice plan.</span></H2>
            <p className="mt-4 max-w-2xl text-slate-300">
              The looper needs no account. An attunr account adds the rest of the practice tools and a daily practice plan made for your level and your time. Log in with your email or Google to make one.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={LOOPER} className={PRIMARY}>Open the looper <Icon name="chevron-right" size={16} /></Link>
              <Link href={loginHref("/plan")} className={SECONDARY}>Create account</Link>
              <Link href="/" className={SECONDARY}><Icon name="sparkles" size={16} /> See the practice plan</Link>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </div>
  );
}
