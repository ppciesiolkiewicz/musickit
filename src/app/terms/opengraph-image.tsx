import { ScrollArt } from "@/app/_og/art";
import { shareCard } from "@/app/_og/card";

/* This page's link preview (src/app/_og/card.tsx); its title and address are in the page's metadata (share.ts). */

export { contentType, size } from "@/app/_og/card";
export const alt = "A scroll of small print with a quill and a seal";

export default function Image() {
  return shareCard({ eyebrow: "Terms", title: "Terms of use", path: "/terms", art: <ScrollArt /> });
}
