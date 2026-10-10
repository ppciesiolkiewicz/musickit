import SiteNav from "@/components/SiteNav";
import type { ReactNode } from "react";
import { SamplerSync } from "@/features/sampler";
import PreloadPiano from "@/features/sound/keyboard/PreloadPiano";
import { LabelSelect } from "@/features/theory/useLabelSystem";

/** Dark page frame with the Music Kit nav, shared by the guitar pages. `labels` adds a floating note-label picker. */
export default function PageShell({ title, intro, active, labels, children }: { title: string; intro?: string; active: string; labels?: boolean; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-slate-200">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-3 px-3 py-3 sm:px-5 sm:py-4">
        <PreloadPiano />
        <SamplerSync />
        <SiteNav active={active} />
        <header>
          <h1 className="text-2xl font-light tracking-wide text-slate-100">{title}</h1>
          {intro && <p className="mt-1 max-w-3xl text-sm text-slate-400">{intro}</p>}
        </header>
        <main>{children}</main>
        {labels && <LabelSelect className="fixed bottom-4 right-4 z-50 rounded-xl border border-slate-700 bg-slate-950/90 px-2.5 py-1.5 shadow-xl backdrop-blur" />}
      </div>
    </div>
  );
}
