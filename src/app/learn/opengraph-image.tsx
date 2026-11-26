import { BookArt } from "@/app/_og/art";
import { shareCard } from "@/app/_og/card";

/* This page's link preview (src/app/_og/card.tsx); its title and address are in the page's metadata (share.ts). */

export { contentType, size } from "@/app/_og/card";
export const alt = "An open book in reading glasses, music notes flying out of it";

export default function Image() {
  return shareCard({ eyebrow: "Learn", title: "Singing and guitar practice guides", path: "/learn", art: <BookArt /> });
}
