import type { Metadata } from "next";
import { VideoRender } from "@/features/teachers/video";

/* a page for the render script only: nothing links to it and search engines keep out */
export const metadata: Metadata = {
  title: "Video render · attunr",
  robots: { index: false, follow: false },
};

export default function VideoRenderPage() {
  return <VideoRender />;
}
