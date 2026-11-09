import type { Metadata } from "next";
import LooperApp from "@/components/looper/LooperApp";
import SiteFooter from "@/components/landing/SiteFooter";
import { GuideProvider } from "@/features/guide/Tier";

export const metadata: Metadata = {
  title: "Online Audio Looper & Multitrack Recorder · attunr",
  description: "Record, loop, and stack audio takes directly in your browser. Connect any audio interface to build multi-channel guitar loops with synced drum beats.",
  alternates: { canonical: "/looper" },
};

export default function LooperPage() {
  return (
    <div className="app-bg min-h-screen text-slate-200">
      <div className="flex w-full flex-col px-3 py-2 sm:px-5 sm:py-3">
        <h1 className="sr-only">Looper</h1>
        <main>
          <GuideProvider pageId="looper">
            <LooperApp />
          </GuideProvider>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
