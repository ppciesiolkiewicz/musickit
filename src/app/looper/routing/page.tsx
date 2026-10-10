import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import RoutingGuide from "@/components/looper/RoutingGuide";

export const metadata: Metadata = {
  title: "Looper routing · Music Kit",
  description: "How sound travels from an audio interface or a BOSS RC-505 through the looper's inputs, effects, buses and groups.",
};

/** Temporary: explains the looper's signal path, with the RC-505 as the example. Linked from the main nav for now. */
export default function LooperRoutingPage() {
  return (
    <PageShell active="/looper/routing" title="Looper routing" intro="Where the sound goes, from the jack to the speakers, with a BOSS RC-505 as the example. Any audio interface works the same way.">
      <RoutingGuide />
    </PageShell>
  );
}
