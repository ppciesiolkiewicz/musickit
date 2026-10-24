import type { Metadata } from "next";
import SiteFooter from "@/components/landing/SiteFooter";
import { StudioApp } from "@/features/teachers/studio";

export const metadata: Metadata = {
  title: "Studio · Music Kit",
  description: "Record a guitar lesson with any chord, scale, position or drone on screen beside your camera.",
};

export default function StudioPage() {
  return (
    <div className="app-bg min-h-screen text-slate-200">
      <StudioApp />
      <div className="px-4">
        <SiteFooter />
      </div>
    </div>
  );
}
