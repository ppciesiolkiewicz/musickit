import type { Metadata } from "next";
import { devTitle } from "@/features/devtools/registry";
import DevShell from "@/features/devtools/DevShell";
import NotesPage from "@/features/devtools/copy/NotesPage";

export const metadata: Metadata = { title: devTitle("/dev/notes") };

export default function CopyNotesPage() {
  return <DevShell><NotesPage /></DevShell>;
}
