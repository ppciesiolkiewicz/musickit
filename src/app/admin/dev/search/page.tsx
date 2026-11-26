import type { Metadata } from "next";
import { devTitle } from "@/features/devtools/registry";
import DevShell from "@/features/devtools/DevShell";
import SearchResearchPage from "@/features/devtools/search/SearchResearchPage";

export const metadata: Metadata = { title: devTitle("/admin/dev/search") };

export default function Search() {
  return <DevShell wide><SearchResearchPage /></DevShell>;
}
