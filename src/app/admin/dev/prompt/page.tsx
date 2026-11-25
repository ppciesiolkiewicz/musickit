import type { Metadata } from "next";
import { devTitle } from "@/features/devtools/registry";
import DevShell from "@/features/devtools/DevShell";
import PromptStudio from "@/features/devtools/prompt/PromptStudio";

export const metadata: Metadata = { title: devTitle("/admin/dev/prompt") };

export default function PromptStudioPage() {
  return <DevShell wide><PromptStudio /></DevShell>;
}
