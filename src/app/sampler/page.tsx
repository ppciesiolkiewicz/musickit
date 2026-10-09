import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { SamplerApp } from "@/features/sampler";

export const metadata: Metadata = {
  title: "Sampler · Music Kit",
  description: "Build instruments from uploaded or generated samples.",
};

export default function SamplerPage() {
  return (
    <PageShell active="/sampler" title="Sampler" intro="Upload or generate sounds, put them on notes, and play them anywhere in the app.">
      <SamplerApp />
    </PageShell>
  );
}
