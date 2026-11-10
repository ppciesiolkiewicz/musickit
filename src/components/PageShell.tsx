import SiteNav from "@/components/SiteNav";
import { PageHeading, PageHeadingRow, PageIntro, pageBar } from "@/components/PageHeading";
import SiteFooter from "@/components/landing/SiteFooter";
import { GROUP_LABEL, sectionFor } from "@/features/theory/sections";
import type { ReactNode } from "react";
import PreloadPiano from "@/features/sound/keyboard/PreloadPiano";
import PracticeReminder from "@/features/plan/PracticeReminder";
import AgentExerciseTools from "@/features/plan/ui/AgentExerciseTools";
import PageHelp, { TourIcon } from "@/features/guide/PageHelp";
import { Notice } from "@/components/ui";
import Icon from "@/components/Icon";
import { GuideProvider } from "@/features/guide/Tier";
import type { TourStep } from "@/features/guide/tour";


/**
 * Dark page frame with the attunr nav, the page title and the site footer, shared by every page but the looper and the studio.
 * Pages are 80rem wide with room at the sides; `wide` keeps the full 96rem for tools that fill the screen (the cheatsheet),
 * and `full` spans the whole window (the scales pages, whose settings column sits on the right edge).
 * Necks and other wide pieces reach back out with the `bleed` utility. `devices` puts the audio input and output picker in the nav,
 * for pages that listen or play.
 */
export default function PageShell({ title, eyebrow, intro, active, wide = false, full = false, devices = false, mic = false, action, header, pageId, tour, children }: {
  title: string;
  /** a short line over the title saying what kind of page this is ("A note from your teacher") */
  eyebrow?: string;
  intro?: string; active: string; wide?: boolean; full?: boolean;
  devices?: boolean;
  /** the page listens to the microphone: adds the mic and headphones note under the intro */
  mic?: boolean;
  /** a button or link in the title row's right corner ("Edit this note") */
  action?: ReactNode;
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
  const heading = <PageHeading title={title} eyebrow={eyebrow} bar={pageBar(active)} />;
  return (
    <div className="app-bg min-h-screen text-slate-200">
      <div className={`mx-auto flex w-full flex-col gap-4 py-3 sm:py-4 ${full ? "px-3 sm:px-6 lg:px-8" : wide ? "max-w-[96rem] px-3 sm:px-5" : "max-w-[80rem] px-3 sm:px-6 lg:px-8"}`}>
        <PreloadPiano />
        <PracticeReminder />
        <AgentExerciseTools />
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
              {pageId || action ? (
                <PageHeadingRow heading={heading} corner={<>{action}{pageId && <PageHelp pageId={pageId} tour={tour} />}</>} />
              ) : (
                heading
              )}
              {intro && <PageIntro>{intro}</PageIntro>}
              {(pageId || mic) && (
                <div className="mt-4 flex max-w-3xl flex-col gap-2">
                  {pageId && (
                    <Notice icon={<TourIcon size={16} />}>
                      <strong className="font-semibold text-slate-100">New here?</strong> Press the compass button in the top right corner for a guide to this page.
                    </Notice>
                  )}
                  {mic && (
                    <Notice tone="warn" icon={<Icon name="headphones" size={16} />}>
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
