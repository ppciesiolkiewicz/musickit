import { PickArt } from "@/app/_og/art";
import { shareCard } from "@/app/_og/card";

/* This page's link preview (src/app/_og/card.tsx); its title and address are in the page's metadata (share.ts). */

export { contentType, size } from "@/app/_og/card";
export const alt = "A puzzled guitar pick under question marks";

export default function Image() {
  return shareCard({ eyebrow: "FAQ", title: "Frequently asked questions", path: "/faq", art: <PickArt /> });
}
