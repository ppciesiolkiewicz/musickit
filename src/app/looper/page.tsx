import type { Metadata } from "next";
import LooperApp from "@/components/looper/LooperApp";

export const metadata: Metadata = {
  title: "Looper · Music Kit",
  description: "A multi-channel audio looper that records from your audio interface.",
};

export default function LooperPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-slate-200">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-2 px-1.5 py-1">
        <h1 className="sr-only">Looper</h1>
        <main>
          <LooperApp />
        </main>
      </div>
    </div>
  );
}
