import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import StageArticle, { StageHero } from "@/components/theory/StageArticle";
import { STAGE_CONTENT } from "@/features/theory/course/stages";

type Params = { n: string };

export function generateStaticParams(): Params[] {
  return STAGE_CONTENT.map((s) => ({ n: String(s.n) }));
}

const find = (n: string) => STAGE_CONTENT.find((s) => String(s.n) === n);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const stage = find((await params).n);
  return stage ? { title: `Stage ${stage.n}: ${stage.title} · attunr`, description: stage.intro } : {};
}

export default async function StagePage({ params }: { params: Promise<Params> }) {
  const stage = find((await params).n);
  if (!stage) notFound();
  const i = STAGE_CONTENT.indexOf(stage);
  return (
    <PageShell active="/theory" title={`Stage ${stage.n} · ${stage.level}: ${stage.title}`} header={<StageHero stage={stage} />}>
      <StageArticle stage={stage} prev={STAGE_CONTENT[i - 1]} next={STAGE_CONTENT[i + 1]} />
    </PageShell>
  );
}
