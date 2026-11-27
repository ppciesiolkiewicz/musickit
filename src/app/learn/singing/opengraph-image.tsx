import { topicImage, topicImageAlt } from "../_topic";

/* This page's link preview (src/app/_og/card.tsx); its title and address are in the page's metadata. */

export { contentType, size } from "@/app/_og/card";
export const alt = topicImageAlt;

export default function Image() {
  return topicImage("singing");
}
