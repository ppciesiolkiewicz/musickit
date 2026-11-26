import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import GlassShapes from "@/components/landing/GlassShapes";
import { ARTICLES } from "@/features/articles";

export const metadata: Metadata = {
  title: "Learn: singing and guitar practice guides · attunr",
  description: "Short guides to practicing singing and guitar, with exercises you can do on the page.",
  alternates: { canonical: "/learn" },
};

/** The public articles (`features/articles`), one card each. */
export default function LearnIndex() {
  return (
    <PageShell active="/learn" column title="Learn" intro="Short guides with exercises you can do right on the page." decor={<GlassShapes />}>
      <ul className="flex flex-col gap-3">
        {ARTICLES.map((a) => (
          <li key={a.slug}>
            <Link href={`/learn/${a.slug}`} className="block rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-slate-500">
              <span className="font-semibold text-slate-50">{a.title}</span>
              <span className="mt-1 block text-sm text-slate-400">{a.intro}</span>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
