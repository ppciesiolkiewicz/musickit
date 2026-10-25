import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/landing/SiteFooter";
import { sectionFor } from "@/features/theory/sections";
import type { ReactNode } from "react";
import PreloadPiano from "@/features/sound/keyboard/PreloadPiano";

/**
 * Dark page frame with the Music Kit nav, the page title and the site footer, shared by every page but the looper and the studio.
 * Pages are 80rem wide with room at the sides; `wide` keeps the full 96rem for tools that fill the screen (the cheatsheet),
 * and `full` spans the whole window (the scales pages, whose settings column sits on the right edge).
 * Necks and other wide pieces reach back out with the `bleed` utility. `devices` puts the audio input and output picker in the nav,
 * for pages that listen or play.
 */
export default function PageShell({ title, intro, active, wide = false, full = false, devices = false, header, children }: { title: string; intro?: string; active: string; wide?: boolean; full?: boolean; devices?: boolean; /** replaces the plain title, for pages that open with a hero */ header?: ReactNode; children: ReactNode }) {
  const section = active.startsWith("/theory/") ? sectionFor(active) : undefined;
  return (
    <div className="app-bg min-h-screen text-slate-200">
      <div className={`mx-auto flex w-full flex-col gap-4 py-3 sm:py-4 ${full ? "px-3 sm:px-6 lg:px-8" : wide ? "max-w-[96rem] px-3 sm:px-5" : "max-w-[80rem] px-3 sm:px-6 lg:px-8"}`}>
        <PreloadPiano />
        <div className="border-b border-slate-800/70 py-1.5 sm:py-2.5">
          <SiteNav active={active} devices={devices} />
        </div>
        <header className="pt-1">
          {/* the breadcrumb belongs to the page, so it sits over the title rather than under the logo */}
          {section && (
            <nav aria-label="Breadcrumb" className="mb-3 flex w-fit items-center gap-1.5 border-b border-slate-700/70 pb-2 text-xs text-slate-500">
              <Link href="/theory" className="hover:text-slate-300">Practice</Link>
              <span aria-hidden>›</span>
              <span className="text-slate-400">{section.label}</span>
            </nav>
          )}
          {header ?? (
            <>
              <h1 className="text-2xl font-light tracking-wide text-slate-100 sm:text-3xl">{title}</h1>
              {intro && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-400">{intro}</p>}
            </>
          )}
        </header>
        <main className="pb-6">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
