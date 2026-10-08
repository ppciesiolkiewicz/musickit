import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import LooperApp from "@/components/looper/LooperApp";

export const metadata: Metadata = {
  title: "Looper · Music Kit",
  description: "A multi-channel audio looper that records from your audio interface.",
};

export default function LooperPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-slate-200">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-1.5 py-4 sm:px-2">
        <SiteNav active="/looper" />
        <header>
          <h1 className="text-xl font-light tracking-wide text-slate-100">Looper</h1>
        </header>
        <main>
          <LooperApp />
        </main>
      </div>
    </div>
  );
}
