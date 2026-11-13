import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import IntroPlayer from "@/features/intro/IntroPlayer";

export const metadata: Metadata = {
  title: "Quick tour · attunr",
  description: "A short tour of attunr: the menus, the AI practice plan, the notes creator, the help on every page and the keys that open any page.",
  alternates: { canonical: "/intro" },
};

export default function IntroPage() {
  return (
    <PageShell title="Quick tour" intro="What's in the menus, where the help is, and the keys that get you anywhere." active="/intro" column>
      <IntroPlayer />
    </PageShell>
  );
}
