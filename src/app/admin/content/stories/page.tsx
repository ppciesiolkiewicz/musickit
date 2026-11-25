import type { Metadata } from "next";
import { contentTitle } from "@/features/devtools/registry";
import ContentShell from "@/features/devtools/ContentShell";
import ComponentStories from "@/features/devtools/stories/ComponentStories";

export const metadata: Metadata = { title: contentTitle("/admin/content/stories") };

export default function StoriesPage() {
  return <ContentShell wide><ComponentStories /></ContentShell>;
}
