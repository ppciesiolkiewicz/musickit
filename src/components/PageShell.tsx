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

/** The reading column of a `column` page: a 48rem text column inside a card's padding and border. */
const COLUMN = "mx-auto w-full max-w-[51rem]";

/**
 * Dark page frame with the attunr nav, the page title and the site footer, shared by every page but the looper and the studio.
 * Pages are 80rem wide with room at the sides; `wide` keeps the full 96rem for tools that fill the screen (the cheatsheet),
 * and `full` spans the whole window (the scales pages, whose settings column sits on the right edge). `full` is only for
 * a page with a settings column (`SettingsPanel`, or the studio's panel): without one the page runs edge to edge.
 * With the settings moved above the page (the panel-position button), a `full` page holding a `SettingsPanel` narrows back to 80rem.
 * Necks and other wide pieces reach back out with the `bleed` utility. `devices` puts the audio input and output picker in the nav,
 * for pages that listen or play. `centered` puts the title, intro and content in the middle, for a page that is one small
 * form (log in, create account). `column` keeps the title and content to one reading column in the middle (the plan, whose
 * cards hold a column of text and tools), while the nav and footer keep the page's width.
 */
export default function PageShell({ title, eyebrow, intro, active, wide = false, full = false, devices = false, mic = false, centered = false, column = false, action, header, related, pageId, tour, decor, children }: {
  title: string;
  /** a short line over the title saying what kind of page this is ("A note from your teacher") */
  eyebrow?: string;
  intro?: string; active: string; wide?: boolean; full?: boolean;
  devices?: boolean;
  /** the page listens to the microphone: adds the mic and headphones note under the intro */
  mic?: boolean;
  /** title, intro and content in the middle of the page, for a page that is one small form */
  centered?: boolean;
  /** the title and content in one reading column in the middle of the page (51rem: a card's padding around a 48rem text column) */
  column?: boolean;
  /** a button or link in the title row's right corner ("Edit this note") */
  action?: ReactNode;
  /** replaces the plain title, for pages that open with a hero (such a page places its own PageHelp) */
  header?: ReactNode;
  /** links to related pages, under the intro and its notices (AlsoTry) */
  related?: ReactNode;
  /** turns on the guide: the level switch, tour button and "?" in the title row, and `Tier` knowing this page */
  pageId?: string;
  /** the page's tour, walked by the tour button; needs `pageId` */
  tour?: TourStep[];
  /** decoration drawn behind the whole page, from the nav down (GlassShapes); it sits under the content and takes no clicks */
  decor?: ReactNode;
  children: ReactNode;
}) {
  const section = sectionFor(active);
  const theory = active.startsWith("/theory/");
  const heading = <PageHeading title={title} eyebrow={eyebrow} bar={pageBar(active)} centered={centered} />;
  return (
    <div className={`app-bg min-h-screen text-slate-200 ${decor ? "isolate" : ""}`}>
      <div className={`${decor ? "relative " : ""}mx-auto flex w-full flex-col gap-4 pt-8 pb-3 sm:pt-12 sm:pb-4 ${full ? "page-full px-3 sm:px-6 lg:px-8" : wide ? "max-w-[96rem] px-3 sm:px-5" : "max-w-[80rem] px-3 sm:px-6 lg:px-8"}`}>
        {decor}
        <PreloadPiano />
        <PracticeReminder />
        <AgentExerciseTools />
        <div className="border-b border-slate-800/70 py-1.5 sm:py-2.5">
          <SiteNav active={active} devices={devices} />
        </div>
        <header className={`pt-6 sm:pt-10 ${centered ? "text-center" : ""} ${column ? COLUMN : ""}`}>
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
              {intro && <PageIntro centered={centered}>{intro}</PageIntro>}
              {(pageId || mic) && (
                <div className="mt-4 flex max-w-3xl flex-col gap-2">
                  {pageId && (
                    <Notice icon={<TourIcon size={16} />}>
                      <strong className="font-semibold text-slate-100">New here?</strong> Press the compass button in the top right corner for a guide to this page.
                    </Notice>
                  )}
                  {mic && (
                    <Notice tone="warn" icon={<Icon name="headphones" size={16} />}>
                      <strong className="font-semibold text-slate-100">This page listens through your microphone.</strong> Wear headphones, so the mic hears only you and not the sound the app plays.
                    </Notice>
                  )}
                </div>
              )}
              {related}
            </>
          )}
        </header>
        <main className={`pb-6 ${centered ? "flex justify-center" : ""} ${column ? COLUMN : ""}`}>{pageId ? <GuideProvider pageId={pageId}>{children}</GuideProvider> : children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
