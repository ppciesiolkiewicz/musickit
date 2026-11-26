import { RocketArt } from "@/app/_og/art";
import { shareCard } from "@/app/_og/card";

/* This page's link preview (src/app/_og/card.tsx); its title and address are in the page's metadata (share.ts). */

export { contentType, size } from "@/app/_og/card";
export const alt = "A guitar taking off like a rocket";

export default function Image() {
  return shareCard({ eyebrow: "Founding partners", title: "attunr for music teachers and schools", path: "/kickstarter", art: <RocketArt /> });
}
