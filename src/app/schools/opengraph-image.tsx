import { ChalkboardArt } from "@/app/_og/art";
import { shareCard } from "@/app/_og/card";

/* This page's link preview (src/app/_og/card.tsx); its title and address are in the page's metadata (share.ts). */

export { contentType, size } from "@/app/_og/card";
export const alt = "A chalkboard with a tune on it, and three guitar picks in the front row";

export default function Image() {
  return shareCard({ eyebrow: "Music schools", title: "A week of practice for every student", path: "/schools", art: <ChalkboardArt /> });
}
