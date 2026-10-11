import SiteNav from "@/components/SiteNav";
import type { ReactNode } from "react";
import PreloadPiano from "@/features/sound/keyboard/PreloadPiano";

/**
 * Dark page frame with the Music Kit nav, shared by the guitar pages. `bleed` lets the content run edge to edge (the cheatsheet board);
 * the nav and title keep their padding either way.
 */
export default function PageShell({ title, intro, active, bleed = false, children }: { title: string; intro?: string; active: string; bleed?: boolean; children: ReactNode }) {
  const padded = "mx-auto flex w-full max-w-[96rem] flex-col gap-3 px-3 sm:px-5";
  const top = (
    <>
      <PreloadPiano />
      <SiteNav active={active} />
      <header>
        <h1 className="text-2xl font-light tracking-wide text-slate-100">{title}</h1>
        {intro && <p className="mt-1 max-w-3xl text-sm text-slate-400">{intro}</p>}
      </header>
    </>
  );
  if (bleed)
    return (
      <div className="app-bg flex min-h-screen flex-col gap-3 py-3 text-slate-200 sm:py-4">
        <div className={padded}>{top}</div>
        <main className="w-full">{children}</main>
      </div>
    );
  return (
    <div className="app-bg min-h-screen text-slate-200">
      <div className={`${padded} py-3 sm:py-4`}>
        {top}
        <main>{children}</main>
      </div>
    </div>
  );
}
