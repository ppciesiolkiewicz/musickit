import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import Icon from "@/components/Icon";
import { btn, btnBase } from "@/components/ui";

export const metadata: Metadata = {
  title: "Page not found · attunr",
  robots: { index: false },
};

/** The 404 page for every route: what happened, and two ways on (home, or the demos). */
export default function NotFound() {
  return (
    <PageShell centered title="Page not found" intro="This page doesn't exist or has moved." active="/404">
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className={btn}>
          <Icon name="chevron-left" size={14} /> Go to home
        </Link>
        <Link href="/demo" className={`${btnBase} border-sky-400/60 bg-sky-500 text-slate-950 hover:bg-sky-400`}>
          <Icon name="music" size={14} /> See demos
        </Link>
      </div>
    </PageShell>
  );
}
