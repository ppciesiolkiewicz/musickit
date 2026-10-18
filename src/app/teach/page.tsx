import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import Icon from "@/components/Icon";
import EarlyAccessForm from "@/components/landing/EarlyAccessForm";
import Photo from "@/components/landing/Photo";
import SiteFooter from "@/components/landing/SiteFooter";
import { DISPLAY, Eyebrow } from "@/components/landing/Display";

export const metadata: Metadata = {
  title: "Teach on Music Kit",
  description: "Teach guitar with every scale, chord, drone and loop a click away, and record lessons in the video studio. Founding teachers set their own rate.",
};

const PERKS = [
  "Bring up any scale, chord, drone or loop mid-lesson",
  "Lesson notes drafted for you; add the details and send",
  "Students arrive already knowing the colours",
  "Set your own rate; founding teachers keep almost all of it",
];

export default function TeachersPage() {
  return (
    <div className="landing app-bg min-h-screen overflow-hidden text-slate-200">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-b border-slate-800/70 py-2.5 sm:py-4">
          <SiteNav active="/teach" />
        </div>

        <section aria-labelledby="teach-h" className="py-12 sm:py-16">
          <div className="ls-card grid grid-cols-[minmax(0,1fr)] items-center gap-8 overflow-hidden rounded-4xl border border-slate-800 bg-slate-900/50 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
            <Photo name="teacher" className="aspect-4/3 h-full lg:aspect-auto" sizes="(min-width: 1024px) 30vw, 100vw" priority />
            <div className="p-6 pt-0 sm:p-10 lg:pl-0 lg:pt-10">
              <Eyebrow tone="text-amber-300">For teachers</Eyebrow>
              <h1 id="teach-h" className="text-4xl leading-tight text-slate-50 sm:text-5xl" style={DISPLAY}>Teach with every sound <span className="ls-accent italic text-amber-300">a click away.</span></h1>
              <ul className="mt-6 grid gap-x-6 gap-y-3 text-sm text-slate-300 sm:grid-cols-2">
                {PERKS.map((p) => (
                  <li key={p} className="flex gap-2"><Icon name="check" size={16} className="mt-0.5 shrink-0 text-amber-300" /><span>{p}</span></li>
                ))}
              </ul>
              <div className="mt-6">
                <EarlyAccessForm source="teachers" compact initial={["teaching"]} cta="I want to teach" done="Thanks! We'll get in touch about teaching on Music Kit." />
              </div>
            </div>
          </div>

          {/* the studio is a separate early tool, an early step towards the teacher app, so it sits apart from the offer */}
          <p className="mt-12 mb-3 text-xs uppercase tracking-[0.18em] text-slate-500">Try it now</p>
          <Link href="/teachers/studio" className="ls-card group flex items-center gap-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-5 transition hover:-translate-y-0.5 hover:border-slate-600 sm:p-6">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-300"><Icon name="layers" size={22} /></span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-xl text-slate-50" style={DISPLAY}>Video studio <span className="rounded-full border border-slate-700 px-2 py-0.5 font-sans text-[11px] not-italic normal-case tracking-normal text-slate-400">Preview</span></span>
              <span className="text-sm text-slate-400">A first teaching tool, free to use: record a lesson with any chord, scale, position or drone on screen beside your camera.</span>
            </span>
            <span aria-hidden className="ml-auto text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-slate-300">→</span>
          </Link>
        </section>

        <SiteFooter />
      </div>
    </div>
  );
}
