import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import { sectionFor } from "@/features/theory/sections";
import type { ReactNode } from "react";
import PreloadPiano from "@/features/sound/keyboard/PreloadPiano";

/** Dark page frame with the Music Kit nav and the page title, shared by every page but the looper. */
export default function PageShell({ title, intro, active, children }: { title: string; intro?: string; active: string; children: ReactNode }) {
  const section = active.startsWith("/theory/") ? sectionFor(active) : undefined;
  return (
    <div className="app-bg min-h-screen text-slate-200">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-3 py-3 sm:px-5 sm:py-4">
        <PreloadPiano />
        <div className="border-b border-slate-800/70 py-1.5 sm:py-2.5">
          <SiteNav active={active} />
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
          <h1 className="text-2xl font-light tracking-wide text-slate-100 sm:text-3xl">{title}</h1>
          {intro && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-400">{intro}</p>}
        </header>
        <main className="pb-6">{children}</main>
      </div>
    </div>
  );
}
