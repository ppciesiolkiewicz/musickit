import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { CreatorApp } from "@/features/creator";

export const metadata: Metadata = {
  title: "Cheatsheet builder · Music Kit",
  description: "Build your own theory cheatsheet: every theory page as a panel that follows one key, compact or in full.",
};

export default function CheatsheetPage() {
  return (
    <PageShell active="/theory/cheatsheet" title="Cheatsheet builder" intro="Choose a key, or none, then switch on the panels you want and arrange them. Every theory page is here: each panel has a compact view and a full one.">
      <CreatorApp />
    </PageShell>
  );
}
