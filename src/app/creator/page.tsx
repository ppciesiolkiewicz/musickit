import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { CreatorApp } from "@/features/creator";

export const metadata: Metadata = {
  title: "Creator · Music Kit",
  description: "Music theory plugins that follow one key: scale, chords, circle of fifths, keys, progressions and modes.",
};

export default function CreatorPage() {
  return (
    <PageShell labels active="/creator" title="Creator" intro="Choose a key, or none, and arrange the theory plugins around it.">
      <CreatorApp />
    </PageShell>
  );
}
