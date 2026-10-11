import type { Metadata } from "next";
import LooperApp from "@/components/looper/LooperApp";

export const metadata: Metadata = {
  title: "Looper · Music Kit",
  description: "A multi-channel audio looper that records from your audio interface.",
};

export default function LooperPage() {
  return (
    <div className="app-bg min-h-screen text-slate-200">
      <div className="flex w-full flex-col">
        <h1 className="sr-only">Looper</h1>
        <main>
          <LooperApp />
        </main>
      </div>
    </div>
  );
}
