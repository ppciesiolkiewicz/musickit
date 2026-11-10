import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/landing/SiteFooter";
import { GROUP_LABEL, sectionFor, type Tone } from "@/features/theory/sections";
import type { ReactNode } from "react";
import PreloadPiano from "@/features/sound/keyboard/PreloadPiano";
import PracticeReminder from "@/features/plan/PracticeReminder";
import PageHelp, { TourIcon } from "@/features/guide/PageHelp";
import { Notice } from "@/components/ui";
import { GuideProvider } from "@/features/guide/Tier";
import type { TourStep } from "@/features/guide/tour";

function MicIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="5.5" y="1.5" width="5" height="8" rx="2.5" />
      <path d="M3 7.5a5 5 0 0 0 10 0M8 12.5v2" />
    </svg>
  );
}

/** The short rule under the title, in the page's own colour (full class names so Tailwind sees them). */
const BAR: Record<Tone, string> = { emerald: "bg-emerald-400", sky: "bg-sky-400", amber: "bg-amber-400", violet: "bg-violet-400", rose: "bg-rose-400", teal: "bg-teal-400", pink: "bg-pink-400", red: "bg-red-400" };

/**
 * Dark page frame with the attunr nav, the page title and the site footer, shared by every page but the looper and the studio.
 * Pages are 80rem wide with room at the sides; `wide` keeps the full 96rem for tools that fill the screen (the cheatsheet),
 * and `full` spans the whole window (the scales pages, whose settings column sits on the right edge).
 * Necks and other wide pieces reach back out with the `bleed` utility. `devices` puts the audio input and output picker in the nav,
 * for pages that listen or play.
 */
export default function PageShell({ title, eyebrow, intro, active, wide = false, full = false, devices = false, mic = false, header, pageId, tour, children }: {
  title: string;
  /** a short line over the title saying what kind of page this is ("A note from your teacher") */
  eyebrow?: string;
  intro?: string; active: string; wide?: boolean; full?: boolean;
  devices?: boolean;
  /** the page listens to the microphone: adds the mic and headphones note under the intro */
  mic?: boolean;
  /** replaces the plain title, for pages that open with a hero (such a page places its own PageHelp) */
  header?: ReactNode;
  /** turns on the guide: the level switch, tour button and "?" in the title row, and `Tier` knowing this page */
  pageId?: string;
  /** the page's tour, walked by the tour button; needs `pageId` */
  tour?: TourStep[];
  children: ReactNode;
}) {
  const section = sectionFor(active);
  const theory = active.startsWith("/theory/");
  const heading = (
    <>
      {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">{eyebrow}</p>}
      <h1 className="text-3xl leading-tight text-slate-50 text-balance sm:text-4xl" style={{ fontFamily: "var(--font-display), serif", fontVariationSettings: '"SOFT" 100, "opsz" 96' }}>{title}</h1>
      <span aria-hidden className={`mt-3 block h-0.5 w-12 rounded-full ${section ? BAR[section.tone] : "bg-sky-400"}`} />
    </>
  );
  return (
    <div className="app-bg min-h-screen text-slate-200">
      <div className={`mx-auto flex w-full flex-col gap-4 py-3 sm:py-4 ${full ? "px-3 sm:px-6 lg:px-8" : wide ? "max-w-[96rem] px-3 sm:px-5" : "max-w-[80rem] px-3 sm:px-6 lg:px-8"}`}>
        <PreloadPiano />
        <PracticeReminder />
        <div className="border-b border-slate-800/70 py-1.5 sm:py-2.5">
          <SiteNav active={active} devices={devices} />
        </div>
        <header className="pt-1">
          {/* the breadcrumb belongs to the page, so it sits over the title rather than under the logo */}
          {section && theory && (
            <nav aria-label="Breadcrumb" className="mb-3 flex w-fit items-center gap-1.5 border-b border-slate-700/70 pb-2 text-xs text-slate-500">
              <span>{GROUP_LABEL[section.group]}</span>
              <span aria-hidden>›</span>
              <span className="text-slate-400">{section.label}</span>
            </nav>
          )}
          {header ?? (
            <>
              {pageId ? (
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div>{heading}</div>
                  <PageHelp pageId={pageId} tour={tour} />
                </div>
              ) : (
                heading
              )}
              {intro && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">{intro}</p>}
              {(pageId || mic) && (
                <div className="mt-4 flex max-w-3xl flex-col gap-2">
                  {pageId && (
                    <Notice icon={<TourIcon size={16} />}>
                      <strong className="font-semibold text-slate-100">New here?</strong> Press the compass button in the top right corner for a guide to this page.
                    </Notice>
                  )}
                  {mic && (
                    <Notice tone="warn" icon={<MicIcon />}>
                      <strong className="font-semibold text-slate-100">Uses your microphone.</strong> Wear headphones so it doesn&apos;t hear its own sound.
                    </Notice>
                  )}
                </div>
              )}
            </>
          )}
        </header>
        <main className="pb-6">{pageId ? <GuideProvider pageId={pageId}>{children}</GuideProvider> : children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
