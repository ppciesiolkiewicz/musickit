import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import GlassShapes from "@/components/landing/GlassShapes";
import { AUTHOR, authorJsonLd } from "@/features/articles/author";
import { JoinCard } from "@/features/articles/ui/ArticleView";
import { SITE_URL } from "@/lib/site";

const description = "I'm Pio, a singer, guitarist and yoga teacher who made attunr: new guitar and singing exercises every day.";

export const metadata: Metadata = {
  title: "About Pio, the founder of attunr",
  description,
  alternates: { canonical: AUTHOR.path },
  openGraph: { type: "profile", siteName: "attunr", url: AUTHOR.path, title: "About Pio, the founder of attunr", description },
  twitter: { card: "summary", title: "About Pio, the founder of attunr", description },
};

/** Who writes the /learn articles and made attunr, in Pio's words (`AUTHOR`), with the ProfilePage structured data the articles' author points at. */
export default function About() {
  const ld = { "@context": "https://schema.org", "@type": "ProfilePage", url: `${SITE_URL}${AUTHOR.path}`, mainEntity: authorJsonLd(SITE_URL) };
  return (
    <PageShell active={AUTHOR.path} column title="About me" decor={<GlassShapes />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- a small square photo, already sized (as in landing/Founder) */}
          <img src={AUTHOR.photo} alt={AUTHOR.alt} width={160} height={160} className="size-28 shrink-0 rounded-full border border-white/15 object-cover ring-4 ring-sky-400/15" />
          <p className="text-slate-400"><b className="text-lg text-slate-100">{AUTHOR.name}</b><br />{AUTHOR.role}</p>
        </div>
        {AUTHOR.note.map((t) => <p key={t} className="text-slate-300">{t}</p>)}
        <p className="text-slate-300">I write the <Link href="/learn" className="text-sky-300 underline-offset-2 hover:underline">guides on Learn</Link>. Each one has exercises you can do right on the page.</p>
      </div>
      <JoinCard about={false} />
    </PageShell>
  );
}
