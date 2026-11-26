import { MouthArt } from "@/app/_og/art";
import { shareCard } from "@/app/_og/card";

/* This page's link preview (src/app/_og/card.tsx); its title and address are in the page's metadata (share.ts). */

export { contentType, size } from "@/app/_og/card";
export const alt = "A singing mouth wrapped in a scarf, with a cup of tea";

export default function Image() {
  return shareCard({ eyebrow: "Voice care", title: "Look after your voice", path: "/voice-care", art: <MouthArt /> });
}
