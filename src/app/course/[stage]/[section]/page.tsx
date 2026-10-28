import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import Icon from "@/components/Icon";
import { DISPLAY, Eyebrow } from "@/components/landing/Display";
import SectionPanel, { StageLine } from "@/components/course/SectionPanel";
import SectionBody from "@/components/course/SectionBody";
import MyNotes from "@/components/course/MyNotes";
import { LEGACY_STAGES } from "@/features/course/legacy";
import { ALL_SECTIONS, findSection, nextSection, sectionHref, stageColour } from "@/features/course/course";

type Params = { stage: string; section: string };

/** Only the course's own stages and sections exist; anything else is a 404. */
export const dynamicParams = false;

/** Addresses from before the stages were renumbered, where no current section has taken them, mapped to the current one. */
const legacy = (stage: string, section: string) => {
  if (findSection(stage, section)) return undefined;
  const to = LEGACY_STAGES[stage];
  return to && findSection(to, section) ? sectionHref(to, section) : undefined;
};

export function generateStaticParams(): Params[] {
  const old = Object.entries(LEGACY_STAGES).flatMap(([from, to]) =>
    ALL_SECTIONS.filter((r) => r.stage.slug === to && legacy(from, r.section.slug)).map((r) => ({ stage: from, section: r.section.slug })));
  return [...ALL_SECTIONS.map((r) => ({ stage: r.stage.slug, section: r.section.slug })), ...old];
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { stage, section } = await params;
  const r = findSection(stage, section);
  return r ? { title: `${r.stage.label} · ${r.section.title} · attunr`, description: r.stage.intro } : {};
}

export default async function CourseSectionPage({ params }: { params: Promise<Params> }) {
  const { stage: st, section: sec } = await params;
  const r = findSection(st, sec);
  if (!r) {
    const to = legacy(st, sec);
    if (to) redirect(to);
    notFound();
  }
  const { stage, section } = r;
  const next = nextSection(st, sec);
  const header = (
    <div className="flex flex-col gap-3">
      <StageLine stage={stage} />
      <div>
        <Eyebrow tone="text-slate-400"><span style={{ color: stageColour(stage.slug) }}>Stage {stage.label} · {stage.title}</span></Eyebrow>
        <h1 className="text-3xl leading-tight text-slate-50 text-balance sm:text-5xl" style={DISPLAY}>{section.title}</h1>
      </div>
    </div>
  );
  return (
    <PageShell active="/course" title={section.title} header={header}>
      <div className="flex items-start gap-8 pb-24 lg:pb-0">
        <SectionPanel stage={stage} current={section.slug} />
        <div className="min-w-0 flex-1">
          <SectionBody section={section} />
          <MyNotes key={`${stage.slug}/${section.slug}`} stage={stage.slug} section={section.slug} />
          <nav aria-label="Next section" className="mt-10 border-t border-slate-800/70 pt-8">
            {next ? (
              <Link href={sectionHref(next.stage.slug, next.section.slug)} className="group flex items-center justify-between gap-4 rounded-3xl border border-slate-700/70 bg-slate-900/60 p-5 transition hover:border-slate-500">
                <span className="min-w-0">
                  <span className="block text-xs uppercase tracking-[0.18em] text-slate-500">Next{next.stage !== stage && ` · Stage ${next.stage.label}: ${next.stage.title}`}</span>
                  <span className="block text-2xl text-slate-50" style={DISPLAY}>{next.section.title}</span>
                </span>
                <Icon name="chevron-right" size={22} className="shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-slate-200" />
              </Link>
            ) : (
              <Link href="/course" className="text-sky-300 hover:underline">← Back to the course</Link>
            )}
          </nav>
        </div>
      </div>
    </PageShell>
  );
}
