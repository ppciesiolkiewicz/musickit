import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import SiteFooter from "@/components/landing/SiteFooter";
import { StudioApp } from "@/features/teachers/studio";

export const metadata: Metadata = {
  title: "Studio · attunr",
  description: "Record a guitar lesson with any chord, scale, position or drone on screen beside your camera.",
};

export default async function StudioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // the notes creator is a tool page like any other; the video studio keeps the whole window for its frame
  if ((await searchParams).notes === "1") {
    return (
      <PageShell active="/teachers/studio?notes=1" full title="Notes creator" intro="Build a page of notes from scales, chords and necks, then share it as a link.">
        <StudioApp notes />
      </PageShell>
    );
  }
  return (
    <div className="app-bg min-h-screen text-slate-200">
      <StudioApp />
      <div className="px-4">
        <SiteFooter />
      </div>
    </div>
  );
}
