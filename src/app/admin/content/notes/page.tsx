import type { Metadata } from "next";
import { contentTitle } from "@/features/devtools/registry";
import ContentShell from "@/features/devtools/ContentShell";
import NotesPage from "@/features/devtools/copy/NotesPage";

export const metadata: Metadata = { title: contentTitle("/admin/content/notes") };

export default function CopyNotesPage() {
  return <ContentShell><NotesPage /></ContentShell>;
}
