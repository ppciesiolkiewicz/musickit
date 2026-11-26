import { CalendarArt } from "@/app/_og/art";
import { shareCard } from "@/app/_og/card";
import { DEMO_PLANS, demoPlan } from "@/features/plan";

/* A demo plan's link preview (src/app/_og/card.tsx): the plan's name over the week's calendar. */

export { contentType, size } from "@/app/_og/card";
export const alt = "A week on a calendar page, with a guitar leaning on it";
export const generateStaticParams = () => Object.keys(DEMO_PLANS).map((slug) => ({ slug }));

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const demo = demoPlan(slug);
  return shareCard({ eyebrow: "Demo plan", title: demo?.label ?? "A ready-made practice plan", path: `/demo/${slug}`, art: <CalendarArt /> });
}
