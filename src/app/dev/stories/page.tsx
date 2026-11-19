import type { Metadata } from "next";
import { devTitle } from "@/features/devtools/registry";
import DevShell from "@/features/devtools/DevShell";
import ComponentStories from "@/features/devtools/stories/ComponentStories";

export const metadata: Metadata = { title: devTitle("/dev/stories") };

export default function StoriesPage() {
  return <DevShell wide><ComponentStories /></DevShell>;
}
