import type { Metadata } from "next";
import { devTitle } from "@/features/devtools/registry";
import DevShell from "@/features/devtools/DevShell";
import DataPage from "@/features/devtools/data/DataPage";

export const metadata: Metadata = { title: devTitle("/admin/dev/data") };

export default function DevDataPage() {
  return <DevShell><DataPage /></DevShell>;
}
