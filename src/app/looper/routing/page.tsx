import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import RoutingGuide from "@/components/looper/RoutingGuide";

export const metadata: Metadata = {
  title: "Looper routing · Music Kit",
  description: "How sound travels from an input device through the looper's inputs, effects, buses and groups.",
};

/** Temporary: explains the looper's signal path, from an input device to the output. Linked from the main nav for now. */
export default function LooperRoutingPage() {
  return (
    <PageShell active="/looper/routing" title="Looper routing" intro="Where the sound goes, from an input device (an audio interface, or a BOSS RC-505 used as one) to the speakers.">
      <RoutingGuide />
    </PageShell>
  );
}
