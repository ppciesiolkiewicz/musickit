import { CalendarArt } from "@/app/_og/art";
import { shareCard } from "@/app/_og/card";

/* This page's link preview (src/app/_og/card.tsx); its title and address are in the page's metadata (share.ts). */

export { contentType, size } from "@/app/_og/card";
export const alt = "A week on a calendar page, with a guitar leaning on it";

export default function Image() {
  return shareCard({ eyebrow: "Demo", title: "Ready-made practice plans and teacher notes", path: "/demo", art: <CalendarArt /> });
}
