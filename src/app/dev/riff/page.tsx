import type { Metadata } from "next";
import { devTitle } from "@/features/devtools/registry";
import DevShell from "@/features/devtools/DevShell";
import RiffLab from "@/features/devtools/riff/RiffLab";

export const metadata: Metadata = { title: devTitle("/dev/riff") };

export default function RiffPage() {
  return <DevShell wide><RiffLab /></DevShell>;
}
