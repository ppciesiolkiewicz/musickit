import { notFound, redirect } from "next/navigation";
import { COURSE, findStage, sectionHref } from "@/features/course/course";
import { LEGACY_STAGES } from "@/features/course/legacy";

type Params = { stage: string };

/** Only the course's own stages and sections exist; anything else is a 404. */
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return [...new Set([...COURSE.map((s) => s.slug), ...Object.keys(LEGACY_STAGES)])].map((stage) => ({ stage }));
}

/** A stage on its own opens at its first section. */
export default async function CourseStagePage({ params }: { params: Promise<Params> }) {
  const slug = (await params).stage;
  const stage = findStage(slug) ?? findStage(LEGACY_STAGES[slug]);
  if (!stage) notFound();
  redirect(sectionHref(stage.slug, stage.sections[0].slug));
}
