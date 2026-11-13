import type { Metadata } from "next";
import Link from "next/link";
import CourseShell from "@/components/course/CourseShell";
import Icon, { type IconName } from "@/components/Icon";
import { DISPLAY, Eyebrow } from "@/components/landing/Display";
import CourseIndex from "@/components/course/CourseIndex";
import { COURSE, sectionHref } from "@/features/course/course";
import PageHelp from "@/features/guide/PageHelp";
import { COURSE_TOUR } from "@/features/guide/tours/course";

import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Guitar Course: Master the Neck One Position at a Time · attunr",
  description: "Learn the guitar neck position by position: master chords, triads, arpeggios, scales, and connecting paths before expanding across the entire fretboard.",
  alternates: { canonical: "/course" },
};

const courseJsonLd = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "Guitar Fretboard Course: Learn One Position at a Time",
  description: "A self-paced guitar course that stays in one fretboard position until it makes sense: chords, triads, arpeggios, scales, and transition paths.",
  provider: {
    "@type": "Organization",
    name: "attunr",
    sameAs: SITE_URL,
  },
};

/** Ways to lay the course out; the index below has a switch and filters for each. */
const WAYS: { icon: IconName; label: string; desc: string; tone: string }[] = [
  { icon: "rows-3", label: "By stage", desc: "One position at a time, from the nut up the neck", tone: "text-sky-300 bg-sky-400/10" },
  { icon: "layers", label: "By topic", desc: "All the chords, all the strumming, all the modes together", tone: "text-amber-300 bg-amber-400/10" },
  { icon: "repeat", label: "Your marks", desc: "Only the sections you rated to work on, or the ones you have solid", tone: "text-violet-300 bg-violet-400/10" },
];

function Hero() {
  return (
    <section aria-labelledby="course-h" className="grid grid-cols-1 items-center gap-8 pb-4 pt-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div>
        <Eyebrow>The self-paced course</Eyebrow>
        <h1 id="course-h" className="text-4xl leading-[1.04] text-slate-50 text-balance sm:text-6xl" style={DISPLAY}>
          Learn guitar on your own, <span className="italic text-sky-300">one position at a time.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
          Stay in one place on the neck until it makes sense: chords, triads, arpeggios and the scale in position 1, then outward. Every note named three ways: degree, solfège, and where it sits on piano and guitar.
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
          A rough order, not a ladder. Nothing has to be mastered before you move on, and you can always come back.
        </p>
        <Link data-tour="course-start" href={sectionHref(COURSE[0].slug, COURSE[0].sections[0].slug)} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-300">
          Start here: {COURSE[0].sections[0].title} <Icon name="chevron-right" size={16} />
        </Link>
        {/* the hero replaces the title row, so the page's help sits here */}
        <div className="mt-5"><PageHelp pageId="course" tour={COURSE_TOUR} /></div>
      </div>
      <div className="flex flex-col gap-3">
        <p className="px-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Organise it your way</p>
        {WAYS.map((w) => (
          <div key={w.label} className="flex items-center gap-4 rounded-2xl border border-slate-700/70 bg-slate-900/50 p-4">
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${w.tone}`}><Icon name={w.icon} size={20} /></span>
            <span className="min-w-0">
              <span className="block text-lg text-slate-50" style={DISPLAY}>{w.label}</span>
              <span className="block text-sm text-slate-400">{w.desc}</span>
            </span>
          </div>
        ))}
        <p className="px-1 text-xs leading-relaxed text-slate-500">Switch the layout and filters just below; the course remembers your choice.</p>
      </div>
    </section>
  );
}

export default function CoursePage() {
  return (
    <CourseShell pageId="course" title="Course" header={<Hero />}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <CourseIndex />
    </CourseShell>
  );
}
