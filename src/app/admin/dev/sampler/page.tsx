import type { Metadata } from "next";
import { devTitle } from "@/features/devtools/registry";
import DevShell from "@/features/devtools/DevShell";
import { SamplerLab } from "@/features/sampler";

export const metadata: Metadata = { title: devTitle("/admin/dev/sampler") };

export default function SamplerPage() {
  return <DevShell><SamplerLab /></DevShell>;
}
