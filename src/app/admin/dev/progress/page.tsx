import type { Metadata } from "next";
import { devTitle } from "@/features/devtools/registry";
import DevShell from "@/features/devtools/DevShell";
import ProgressPage from "@/features/devtools/progress/ProgressPage";

export const metadata: Metadata = { title: devTitle("/admin/dev/progress") };

export default function DevProgressPage() {
  return <DevShell><ProgressPage /></DevShell>;
}
