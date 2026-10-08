import SiteNav from "@/components/SiteNav";
import type { ReactNode } from "react";

/** Dark page frame with the Music Kit nav, shared by the guitar pages. */
export default function PageShell({ title, intro, active, children }: { title: string; intro?: string; active: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-slate-200">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-2 px-0.5 py-1">
        <SiteNav active={active} />
        <header>
          <h1 className="text-2xl font-light tracking-wide text-slate-100">{title}</h1>
          {intro && <p className="mt-1 max-w-3xl text-sm text-slate-400">{intro}</p>}
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
