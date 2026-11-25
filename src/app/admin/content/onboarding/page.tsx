import type { Metadata } from "next";
import { contentTitle } from "@/features/devtools/registry";
import ContentShell from "@/features/devtools/ContentShell";
import CoverageView from "@/features/guide/CoverageView";

export const metadata: Metadata = { title: contentTitle("/admin/content/onboarding") };

export default function OnboardingPage() {
  return <ContentShell wide><CoverageView /></ContentShell>;
}
