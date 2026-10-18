import { notFound, redirect } from "next/navigation";
import { COURSE, findStage, sectionHref } from "@/features/course/course";

type Params = { stage: string };

/** Only the course's own stages and sections exist; anything else is a 404. */
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return COURSE.map((s) => ({ stage: s.slug }));
}

/** A stage on its own opens at its first section. */
export default async function CourseStagePage({ params }: { params: Promise<Params> }) {
  const stage = findStage((await params).stage);
  if (!stage) notFound();
  redirect(sectionHref(stage.slug, stage.sections[0].slug));
}
