import type { Metadata } from "next";
import { devTitle } from "@/features/devtools/registry";
import DevShell from "@/features/devtools/DevShell";
import ComposeLab from "@/features/devtools/compose/ComposeLab";

export const metadata: Metadata = { title: devTitle("/admin/dev/compose") };

export default function ComposePage() {
  return <DevShell wide><ComposeLab /></DevShell>;
}
