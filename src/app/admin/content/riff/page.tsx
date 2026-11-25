import type { Metadata } from "next";
import { contentTitle } from "@/features/devtools/registry";
import ContentShell from "@/features/devtools/ContentShell";
import RiffLab from "@/features/devtools/riff/RiffLab";

export const metadata: Metadata = { title: contentTitle("/admin/content/riff") };

export default function RiffPage() {
  return <ContentShell wide><RiffLab /></ContentShell>;
}
