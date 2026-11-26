import { PadlockArt } from "@/app/_og/art";
import { shareCard } from "@/app/_og/card";

/* This page's link preview (src/app/_og/card.tsx); its title and address are in the page's metadata (share.ts). */

export { contentType, size } from "@/app/_og/card";
export const alt = "A padlock keeping quiet, with a key shaped like a note";

export default function Image() {
  return shareCard({ eyebrow: "Privacy", title: "Privacy policy", path: "/privacy", art: <PadlockArt /> });
}
